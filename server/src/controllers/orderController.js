import { Order, Product, ProductItem, PromoCode } from '../models/index.js';
import { purchaseFromBalance } from '../services/purchaseService.js';

export const createOrder = async (req, res) => {
  try {
    const { productId, quantity, promoCode, paymentMethod } = req.body;

    if (paymentMethod === 'balance') {
      const result = await purchaseFromBalance({
        userId: req.user.id,
        productId: parseInt(productId),
        quantity: quantity || 1,
        promoCode,
      });
      return res.status(201).json({
        order: { ...result.order.toJSON(), product: result.product.toJSON() },
      });
    }

    // Other payment methods — placeholder
    res.status(400).json({ error: 'Только оплата с баланса' });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Ошибка создания заказа' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{ model: Product, as: 'product' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Product, as: 'product' },
        { model: ProductItem, as: 'deliveredItems', attributes: ['id', 'content', 'imageUrl'] },
      ],
    });
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказа' });
  }
};

export const checkPromoCode = async (req, res) => {
  try {
    const { code } = req.body;
    const promo = await PromoCode.findOne({ where: { code, isActive: true } });
    if (!promo) return res.status(404).json({ error: 'Промокод не найден' });
    if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Промокод исчерпан' });
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return res.status(400).json({ error: 'Промокод истёк' });

    res.json({
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка проверки промокода' });
  }
};
