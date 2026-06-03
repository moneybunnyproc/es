import { Router } from 'express';
import { createOrder, getMyOrders, getOrder, checkPromoCode } from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', getOrder);
router.post('/check-promo', checkPromoCode);

export default router;
