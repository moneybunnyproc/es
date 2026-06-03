import { Router } from 'express';
import { getMyMessages, sendMessage, sendImageMessage } from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);
router.get('/messages', getMyMessages);
router.post('/messages', sendMessage);
router.post('/messages/image', upload.single('image'), sendImageMessage);

export default router;
