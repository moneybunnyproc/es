import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

export const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Логин от 3 до 50 символов' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const user = await User.create({ username, password, email });
    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.status(201).json({ user: user.toJSON(), token });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Аккаунт заблокирован' });
    }

    const valid = await user.checkPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user.id, requires2FA: true },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ requires2FA: true, tempToken });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

    res.json({ user: user.toJSON(), token });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка входа' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Выход выполнен' });
};

export const me = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const valid = await req.user.checkPassword(oldPassword);
    if (!valid) {
      return res.status(400).json({ error: 'Неверный текущий пароль' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    }

    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Пароль изменён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка смены пароля' });
  }
};

// Generate link code for Telegram binding
export const getTelegramLinkCode = async (req, res) => {
  try {
    const code = `link_${req.user.id}_${Date.now().toString(36)}`;
    // Store temporarily (5 min TTL) — using a simple in-memory store
    telegramLinkCodes.set(code, { userId: req.user.id, expires: Date.now() + 5 * 60 * 1000 });
    res.json({ code, botUsername: process.env.TELEGRAM_BOT_USERNAME || null });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка генерации кода' });
  }
};

export const unlinkTelegram = async (req, res) => {
  try {
    req.user.telegramId = null;
    req.user.telegramUsername = null;
    await req.user.save();
    res.json({ message: 'Telegram отвязан' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка отвязки' });
  }
};

// In-memory store for link codes (simple approach)
export const telegramLinkCodes = new Map();
