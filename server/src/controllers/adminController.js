import { User, Shop, Category, Product, ProductImage, ProductItem, Order, Review, PromoCode, BalanceTransaction, Setting } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

// Dashboard
export const getDashboard = async (req, res) => {
  try {
    const [usersCount, ordersCount, totalRevenue, productsCount] = await Promise.all([
      User.count(),
      Order.count({ where: { status: 'delivered' } }),
      Order.sum('totalPrice', { where: { status: 'delivered' } }),
      Product.count(),
    ]);

    const recentOrders = await Order.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] },
        { model: Product, as: 'product', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({
      stats: { usersCount, ordersCount, totalRevenue: totalRevenue || 0, productsCount },
      recentOrders,
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки дашборда' });
  }
};

// Users management
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const where = search ? { username: { [Op.iLike]: `%${search}%` } } : {};

    const { count, rows } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({ users: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки пользователей' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const { role, balance, personalDiscount, isBanned } = req.body;
    if (role !== undefined) user.role = role;
    if (balance !== undefined) user.balance = balance;
    if (personalDiscount !== undefined) user.personalDiscount = personalDiscount;
    if (isBanned !== undefined) user.isBanned = isBanned;

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления пользователя' });
  }
};

export const addUserBalance = async (req, res) => {
  try {
    const { amount, description } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    user.balance = parseFloat(user.balance) + parseFloat(amount);
    await user.save();

    await BalanceTransaction.create({
      userId: user.id,
      amount: parseFloat(amount),
      type: 'admin',
      description: description || 'Пополнение администратором',
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка пополнения баланса' });
  }
};

// Shops management
export const adminGetShops = async (req, res) => {
  try {
    const shops = await Shop.findAll({ order: [['sortOrder', 'ASC']] });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки витрин' });
  }
};

export const createShop = async (req, res) => {
  try {
    const shop = await Shop.create(req.body);
    res.status(201).json(shop);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания витрины' });
  }
};

export const updateShop = async (req, res) => {
  try {
    const shop = await Shop.findByPk(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Витрина не найдена' });
    await shop.update(req.body);
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления витрины' });
  }
};

export const deleteShop = async (req, res) => {
  try {
    await Shop.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Витрина удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления витрины' });
  }
};

// Categories management
export const adminGetCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      include: [{ model: Shop, as: 'shop' }],
      order: [['sortOrder', 'ASC']],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки категорий' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания категории' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Категория не найдена' });
    await cat.update(req.body);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления категории' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await Category.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Категория удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления категории' });
  }
};

// Products management
export const adminGetProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { count, rows } = await Product.findAndCountAll({
      include: [
        { model: ProductImage, as: 'images' },
        { model: Category, as: 'category', include: [{ model: Shop, as: 'shop' }] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      attributes: {
        include: [
          [sequelize.literal(`(SELECT COUNT(*) FROM product_items WHERE product_items."productId" = "Product"."id" AND product_items."isSold" = false)`), 'stockCount'],
          [sequelize.literal(`(SELECT COUNT(*) FROM product_items WHERE product_items."productId" = "Product"."id")`), 'totalItems'],
        ],
      },
    });

    res.json({ products: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    await product.update(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await ProductImage.destroy({ where: { productId: req.params.id } });
    await ProductItem.destroy({ where: { productId: req.params.id } });
    await Product.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Товар удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления товара' });
  }
};

// Product images
export const addProductImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл обязателен' });
    const image = await ProductImage.create({
      productId: req.params.id,
      url: `/uploads/${req.file.filename}`,
    });
    res.status(201).json(image);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки изображения' });
  }
};

export const deleteProductImage = async (req, res) => {
  try {
    await ProductImage.destroy({ where: { id: req.params.imageId } });
    res.json({ message: 'Изображение удалено' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления изображения' });
  }
};

// Product items (digital stock)
export const getProductItems = async (req, res) => {
  try {
    const items = await ProductItem.findAll({
      where: { productId: req.params.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
};

export const addProductItems = async (req, res) => {
  try {
    const { items } = req.body;
    const productId = req.params.id;

    let itemsList;
    if (Array.isArray(items)) {
      // Array of objects {content, imageUrl} or array of strings
      itemsList = items.map(item => {
        if (typeof item === 'string') return { productId, content: item.trim() };
        return { productId, content: item.content?.trim(), imageUrl: item.imageUrl || null };
      }).filter(i => i.content);
    } else {
      // Single string separated by newlines (dump mode)
      itemsList = items.split('\n').filter(i => i.trim()).map(content => ({
        productId,
        content: content.trim(),
      }));
    }

    const created = await ProductItem.bulkCreate(itemsList);
    res.status(201).json({ count: created.length, items: created });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка добавления товаров' });
  }
};

// Upload image for a stock item
export const uploadItemImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл обязателен' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
};

export const deleteProductItem = async (req, res) => {
  try {
    await ProductItem.destroy({ where: { id: req.params.itemId, isSold: false } });
    res.json({ message: 'Элемент удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления элемента' });
  }
};

// Orders management
export const adminGetOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    const where = status ? { status } : {};

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] },
        { model: Product, as: 'product', attributes: ['id', 'name', 'price'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({ orders: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заказов' });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Заказ не найден' });

    const { status } = req.body;

    if (status === 'refunded' && order.status === 'delivered') {
      const user = await User.findByPk(order.userId);
      user.balance = parseFloat(user.balance) + parseFloat(order.totalPrice);
      await user.save();

      await BalanceTransaction.create({
        userId: order.userId,
        amount: parseFloat(order.totalPrice),
        type: 'refund',
        description: `Возврат по заказу #${order.id}`,
        orderId: order.id,
      });
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления заказа' });
  }
};

// Promo codes
export const getPromoCodes = async (req, res) => {
  try {
    const codes = await PromoCode.findAll({ order: [['createdAt', 'DESC']] });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки промокодов' });
  }
};

export const createPromoCode = async (req, res) => {
  try {
    const code = await PromoCode.create(req.body);
    res.status(201).json(code);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания промокода' });
  }
};

export const updatePromoCode = async (req, res) => {
  try {
    const code = await PromoCode.findByPk(req.params.id);
    if (!code) return res.status(404).json({ error: 'Промокод не найден' });
    await code.update(req.body);
    res.json(code);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления промокода' });
  }
};

export const deletePromoCode = async (req, res) => {
  try {
    await PromoCode.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Промокод удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления промокода' });
  }
};

// Reviews management
export const adminGetReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] },
        { model: Product, as: 'product', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки отзывов' });
  }
};

export const toggleReviewVisibility = async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review) return res.status(404).json({ error: 'Отзыв не найден' });
    review.isVisible = !review.isVisible;
    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления отзыва' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    await Review.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Отзыв удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления отзыва' });
  }
};

// Settings
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки настроек' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await Setting.upsert({ key, value });
    }
    res.json({ message: 'Настройки обновлены' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
};
