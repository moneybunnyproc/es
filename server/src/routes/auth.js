import { Router } from 'express';
import { register, login, logout, me, changePassword, getTelegramLinkCode, unlinkTelegram } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { verifyCaptcha, generateCaptcha } from '../middleware/captcha.js';

const router = Router();

router.get('/captcha', generateCaptcha);
router.post('/register', verifyCaptcha, register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);
router.post('/telegram-link', authenticate, getTelegramLinkCode);
router.post('/telegram-unlink', authenticate, unlinkTelegram);

export default router;
