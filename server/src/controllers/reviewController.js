import { Review, User, Product, Order } from '../models/index.js';

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.findAll({
      where: { productId, isVisible: true },
      include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки отзывов' });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Review.findAndCountAll({
      where: { isVisible: true },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] },
        { model: Product, as: 'product', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({ reviews: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки отзывов' });
  }
};

export const createReview = async (req, res) => {
  try {
    const { productId, rating, text } = req.body;

    // Check if user bought this product
    const hasPurchase = await Order.findOne({
      where: { userId: req.user.id, productId, status: 'delivered' },
    });

    if (!hasPurchase) {
      return res.status(400).json({ error: 'Можно оставить отзыв только на купленный товар' });
    }

    const existing = await Review.findOne({
      where: { userId: req.user.id, productId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Вы уже оставляли отзыв на этот товар' });
    }

    const review = await Review.create({
      userId: req.user.id,
      productId,
      rating: Math.max(1, Math.min(5, rating)),
      text,
    });

    const reviewWithUser = await Review.findByPk(review.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
    });

    res.status(201).json(reviewWithUser);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания отзыва' });
  }
};
