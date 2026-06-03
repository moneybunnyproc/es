import { Shop, Category, Product, ProductImage, ProductItem } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

export const getShops = async (req, res) => {
  try {
    const shops = await Shop.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC']],
      include: [{
        model: Category,
        as: 'categories',
        where: { isActive: true },
        required: false,
        order: [['sortOrder', 'ASC']],
      }],
    });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки витрин' });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { shopId } = req.params;
    const categories = await Category.findAll({
      where: { shopId, isActive: true },
      order: [['sortOrder', 'ASC']],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки категорий' });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const products = await Product.findAll({
      where: { categoryId, isActive: true },
      order: [['sortOrder', 'ASC']],
      include: [
        { model: ProductImage, as: 'images', order: [['sortOrder', 'ASC']] },
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(SELECT COUNT(*) FROM product_items WHERE product_items."productId" = "Product"."id" AND product_items."isSold" = false)`),
            'stockCount',
          ],
        ],
      },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товаров' });
  }
};

export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, {
      include: [
        { model: ProductImage, as: 'images', order: [['sortOrder', 'ASC']] },
        { model: Category, as: 'category', include: [{ model: Shop, as: 'shop' }] },
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(SELECT COUNT(*) FROM product_items WHERE product_items."productId" = "Product"."id" AND product_items."isSold" = false)`),
            'stockCount',
          ],
        ],
      },
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки товара' });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const products = await Product.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { description: { [Op.iLike]: `%${q}%` } },
        ],
      },
      include: [
        { model: ProductImage, as: 'images' },
        { model: Category, as: 'category' },
      ],
      limit: 20,
    });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка поиска' });
  }
};
