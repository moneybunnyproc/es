import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getDashboard,
  getUsers, getUserDetail, updateUser, addUserBalance,
  adminGetShops, createShop, updateShop, deleteShop,
  adminGetCategories, createCategory, updateCategory, deleteCategory,
  adminGetProducts, createProduct, updateProduct, deleteProduct,
  addProductImage, deleteProductImage,
  getProductItems, addProductItems, deleteProductItem, uploadItemImage,
  getWarehouseStock, getWarehouseItems, clearProductStock,
  adminGetOrders, updateOrderStatus,
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
  adminGetReviews, toggleReviewVisibility, deleteReview,
  getSettings, updateSettings,
  getTransactions,
} from '../controllers/adminController.js';
import { getChats, getChatMessages, getChatUserInfo, getUnreadCount, operatorReply } from '../controllers/chatController.js';
import {
  adminGetPaymentSystems, createPaymentSystem, updatePaymentSystem, deletePaymentSystem,
  getPaymentCallbacks, adminGetDeposits,
} from '../controllers/paymentController.js';
import {
  getBots, getBotFull, createBot, updateBot, deleteBot, startBotAction, stopBotAction,
} from '../controllers/botController.js';

const router = Router();

router.use(authenticate, requireRole('admin', 'operator'));

// Dashboard
router.get('/dashboard', getDashboard);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.put('/users/:id', requireRole('admin'), updateUser);
router.post('/users/:id/balance', requireRole('admin'), addUserBalance);

// Shops
router.get('/shops', adminGetShops);
router.post('/shops', requireRole('admin'), createShop);
router.put('/shops/:id', requireRole('admin'), updateShop);
router.delete('/shops/:id', requireRole('admin'), deleteShop);

// Categories
router.get('/categories', adminGetCategories);
router.post('/categories', requireRole('admin'), createCategory);
router.put('/categories/:id', requireRole('admin'), updateCategory);
router.delete('/categories/:id', requireRole('admin'), deleteCategory);

// Products
router.get('/products', adminGetProducts);
router.post('/products', requireRole('admin'), createProduct);
router.put('/products/:id', requireRole('admin'), updateProduct);
router.delete('/products/:id', requireRole('admin'), deleteProduct);
router.post('/products/:id/images', requireRole('admin'), upload.single('image'), addProductImage);
router.delete('/products/:id/images/:imageId', requireRole('admin'), deleteProductImage);
router.get('/products/:id/items', getProductItems);
router.post('/products/:id/items', requireRole('admin'), addProductItems);
router.post('/products/:id/items/upload-image', requireRole('admin'), upload.single('image'), uploadItemImage);
router.delete('/products/:id/items/:itemId', requireRole('admin'), deleteProductItem);

// Warehouse
router.get('/warehouse', getWarehouseStock);
router.get('/warehouse/items', getWarehouseItems);
router.delete('/warehouse/products/:id/items', requireRole('admin'), clearProductStock);
router.delete('/warehouse/items/:itemId', requireRole('admin'), deleteProductItem);

// Orders
router.get('/orders', adminGetOrders);
router.put('/orders/:id/status', requireRole('admin'), updateOrderStatus);

// Promo codes
router.get('/promo-codes', getPromoCodes);
router.post('/promo-codes', requireRole('admin'), createPromoCode);
router.put('/promo-codes/:id', requireRole('admin'), updatePromoCode);
router.delete('/promo-codes/:id', requireRole('admin'), deletePromoCode);

// Reviews
router.get('/reviews', adminGetReviews);
router.put('/reviews/:id/toggle', requireRole('admin'), toggleReviewVisibility);
router.delete('/reviews/:id', requireRole('admin'), deleteReview);

// Chat
router.get('/chats/unread-count', getUnreadCount);
router.get('/chats', getChats);
router.get('/chats/:userId', getChatMessages);
router.get('/chats/:userId/info', getChatUserInfo);
router.post('/chats/:userId/reply', operatorReply);

// Payment Systems
router.get('/payment-systems', adminGetPaymentSystems);
router.post('/payment-systems', requireRole('admin'), createPaymentSystem);
router.put('/payment-systems/:id', requireRole('admin'), updatePaymentSystem);
router.delete('/payment-systems/:id', requireRole('admin'), deletePaymentSystem);
router.get('/payment-callbacks', getPaymentCallbacks);
router.get('/deposits', adminGetDeposits);

// Bots
router.get('/bots', getBots);
router.get('/bots/:id', requireRole('admin'), getBotFull);
router.post('/bots', requireRole('admin'), createBot);
router.put('/bots/:id', requireRole('admin'), updateBot);
router.delete('/bots/:id', requireRole('admin'), deleteBot);
router.post('/bots/:id/start', requireRole('admin'), startBotAction);
router.post('/bots/:id/stop', requireRole('admin'), stopBotAction);

// Transactions
router.get('/transactions', getTransactions);

// Settings
router.get('/settings', getSettings);
router.put('/settings', requireRole('admin'), updateSettings);

export default router;
