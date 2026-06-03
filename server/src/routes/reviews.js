import { Router } from 'express';
import { getProductReviews, getAllReviews, createReview } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getAllReviews);
router.get('/product/:productId', getProductReviews);
router.post('/', authenticate, createReview);

export default router;
