import { Router } from 'express';
import { getShops, getCategories, getProducts, getProduct, searchProducts } from '../controllers/shopController.js';

const router = Router();

router.get('/shops', getShops);
router.get('/shops/:shopId/categories', getCategories);
router.get('/categories/:categoryId/products', getProducts);
router.get('/products/search', searchProducts);
router.get('/products/:id', getProduct);

export default router;
