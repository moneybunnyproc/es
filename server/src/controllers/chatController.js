import { ChatMessage, User, Order, Product } from '../models/index.js';
import { notifyUser } from '../bot/index.js';

export const getMyMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'ASC']],
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки сообщений' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    const chatMessage = await ChatMessage.create({
      userId: req.user.id,
      message: message.trim(),
      isFromOperator: false,
    });

    // Notify operators only (client gets response via API)
    const io = req.app.get('io');
    if (io) {
      io.to('operators').emit('newClientMessage', {
        ...chatMessage.toJSON(),
        user: { id: req.user.id, username: req.user.username },
      });
    }

    res.status(201).json(chatMessage);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
};

export const sendImageMessage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Изображение обязательно' });
    }

    const chatMessage = await ChatMessage.create({
      userId: req.user.id,
      imageUrl: `/uploads/${req.file.filename}`,
      isFromOperator: false,
    });

    // Notify operators only
    const io = req.app.get('io');
    if (io) {
      io.to('operators').emit('newClientMessage', {
        ...chatMessage.toJSON(),
        user: { id: req.user.id, username: req.user.username },
      });
    }

    res.status(201).json(chatMessage);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отправки изображения' });
  }
};

// Operator endpoints
export const getChats = async (req, res) => {
  try {
    // Get distinct userIds that have chat messages
    const rows = await ChatMessage.findAll({
      attributes: ['userId'],
      group: ['userId'],
      raw: true,
    });

    const chatList = await Promise.all(
      rows.map(async (row) => {
        const user = await User.findByPk(row.userId, { attributes: ['id', 'username'] });
        const lastMessage = await ChatMessage.findOne({
          where: { userId: row.userId },
          order: [['createdAt', 'DESC']],
        });
        const unreadCount = await ChatMessage.count({
          where: { userId: row.userId, isFromOperator: false, isRead: false },
        });
        return {
          userId: row.userId,
          username: user?.username || 'Unknown',
          lastMessage,
          unreadCount,
        };
      })
    );

    res.json(chatList);
  } catch (err) {
    console.error('getChats error:', err);
    res.status(500).json({ error: 'Ошибка загрузки чатов' });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await ChatMessage.findAll({
      where: { userId },
      order: [['createdAt', 'ASC']],
    });

    // Mark as read
    await ChatMessage.update(
      { isRead: true },
      { where: { userId, isFromOperator: false, isRead: false } }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки сообщений' });
  }
};

export const getChatUserInfo = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'balance', 'personalDiscount', 'role', 'isBanned', 'createdAt'],
    });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const orders = await Order.findAll({
      where: { userId },
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    const totalOrders = await Order.count({ where: { userId } });
    const totalSpent = await Order.sum('totalPrice', { where: { userId, status: 'delivered' } }) || 0;

    res.json({ user, orders, totalOrders, totalSpent });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки информации' });
  }
};

export const operatorReply = async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    const chatMessage = await ChatMessage.create({
      userId: parseInt(userId),
      message: message.trim(),
      isFromOperator: true,
      operatorId: req.user.id,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${userId}`).emit('newMessage', chatMessage);
    }

    // Notify via Telegram
    notifyUser(parseInt(userId), `💬 Ответ от поддержки:\n${message.trim()}`);

    res.status(201).json(chatMessage);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отправки ответа' });
  }
};
