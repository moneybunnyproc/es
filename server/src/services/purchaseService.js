import { Product, ProductItem, Order, User, BalanceTransaction, PromoCode } from '../models/index.js';
import sequelize from '../config/database.js';

/**
 * Purchase digital goods from balance.
 * Returns { order, deliveredContent } on success, throws on error.
 */
export async function purchaseFromBalance({ userId, productId, quantity, promoCode }) {
  const t = await sequelize.transaction();

  try {
    const product = await Product.findByPk(productId, { transaction: t });
    if (!product || !product.isActive) {
      throw Object.assign(new Error('Товар не найден'), { status: 404 });
    }

    const qty = Math.max(product.minQuantity || 1, Math.min(quantity || 1, product.maxQuantity || 100));

    const availableItems = await ProductItem.findAll({
      where: { productId, isSold: false },
      limit: qty,
      transaction: t,
    });

    if (availableItems.length < qty) {
      throw Object.assign(new Error(`Недостаточно товара. Доступно: ${availableItems.length}`), { status: 400 });
    }

    const user = await User.findByPk(userId, { transaction: t });
    if (!user) throw Object.assign(new Error('Пользователь не найден'), { status: 404 });

    let totalPrice = parseFloat(product.price) * qty;
    let discount = 0;
    let promoCodeId = null;

    // Personal discount
    if (user.personalDiscount > 0) {
      discount += totalPrice * (user.personalDiscount / 100);
    }

    // Promo code
    if (promoCode) {
      const promo = await PromoCode.findOne({ where: { code: promoCode, isActive: true }, transaction: t });
      if (promo) {
        if (promo.maxUses && promo.usedCount >= promo.maxUses) throw Object.assign(new Error('Промокод исчерпан'), { status: 400 });
        if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) throw Object.assign(new Error('Промокод истёк'), { status: 400 });
        if (totalPrice < parseFloat(promo.minOrderAmount)) throw Object.assign(new Error(`Минимальная сумма: ${promo.minOrderAmount}`), { status: 400 });

        if (promo.discountType === 'percent') {
          discount += totalPrice * (parseFloat(promo.discountValue) / 100);
        } else {
          discount += parseFloat(promo.discountValue);
        }
        promoCodeId = promo.id;
        promo.usedCount += 1;
        await promo.save({ transaction: t });
      }
    }

    totalPrice = Math.max(0, totalPrice - discount);

    if (parseFloat(user.balance) < totalPrice) {
      throw Object.assign(new Error('Недостаточно средств на балансе'), { status: 400 });
    }

    // Deduct balance using increment (safe, no SQL interpolation)
    await user.decrement('balance', { by: totalPrice, transaction: t });

    const deliveredContent = availableItems.map(i => i.content).join('\n---\n');

    await ProductItem.update({ isSold: true }, { where: { id: availableItems.map(i => i.id) }, transaction: t });
    await product.increment('salesCount', { by: qty, transaction: t });

    const order = await Order.create({
      userId, productId, promoCodeId,
      quantity: qty, totalPrice, discount,
      status: 'delivered', paymentMethod: 'balance', deliveredContent,
    }, { transaction: t });

    await BalanceTransaction.create({
      userId, amount: -totalPrice, type: 'purchase',
      description: `Покупка: ${product.name} x${qty}`,
      orderId: order.id,
    }, { transaction: t });

    await ProductItem.update({ orderId: order.id }, { where: { id: availableItems.map(i => i.id) }, transaction: t });

    await t.commit();

    return { order, product, deliveredContent, totalPrice };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
