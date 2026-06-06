import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createDeposit, getPaymentChannels, getMyDeposits, checkDepositStatus, handleWebhook,
  getCryptoChannels, createCryptoDepositOrder, checkCryptoDepositStatus, getMyCryptoDeposits,
} from '../controllers/paymentController.js';

const router = Router();

// Client routes (auth required)
router.get('/channels', authenticate, getPaymentChannels);
router.post('/deposit', authenticate, createDeposit);
router.get('/my-deposits', authenticate, getMyDeposits);
router.post('/check/:id', authenticate, checkDepositStatus);

// Crypto
router.get('/crypto/channels', authenticate, getCryptoChannels);
router.post('/crypto/deposit', authenticate, createCryptoDepositOrder);
router.post('/crypto/check/:id', authenticate, checkCryptoDepositStatus);
router.get('/crypto/my-deposits', authenticate, getMyCryptoDeposits);

// Webhook (no auth — called by payment system)
router.post('/webhook/:code', handleWebhook);

export default router;
