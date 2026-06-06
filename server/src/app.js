import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { sequelize, User } from './models/index.js';
import authRoutes from './routes/auth.js';
import shopRoutes from './routes/shop.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import { startBotFromDB } from './bot/index.js';
import { pollCryptoDeposits } from './services/cryptoService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Create uploads directory
const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  socket.on('joinChat', (userId) => {
    socket.join(`chat_${userId}`);
  });

  socket.on('joinOperators', () => {
    socket.join('operators');
  });

  socket.on('disconnect', () => {});
});

// Start server
const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    await sequelize.sync({ alter: true });
    console.log('Models synced');

    // Create default admin
    const adminExists = await User.findOne({ where: { username: 'root' } });
    if (!adminExists) {
      await User.create({
        username: 'root',
        password: 'root',
        role: 'admin',
      });
      console.log('Default admin created (root/root)');
    }

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startBotFromDB();

      // Poll crypto deposits every 60 seconds
      setInterval(() => pollCryptoDeposits().catch(console.error), 60000);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
};

start();
