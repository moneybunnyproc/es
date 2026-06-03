import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createDeposit, getPaymentChannels, getMyDeposits, checkDepositStatus, handleWebhook } from '../controllers/paymentController.js';

const router = Router();

// Client routes (auth required)
router.get('/channels', authenticate, getPaymentChannels);
router.post('/deposit', authenticate, createDeposit);
router.get('/my-deposits', authenticate, getMyDeposits);
router.post('/check/:id', authenticate, checkDepositStatus);

// Webhook (no auth — called by payment system)
router.post('/webhook/:code', handleWebhook);

export default router;
