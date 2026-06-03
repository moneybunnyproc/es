import { BotConfig } from '../models/index.js';
import { startBotWithConfig, stopBot, getBot } from '../bot/index.js';

export const getBots = async (req, res) => {
  try {
    const bots = await BotConfig.findAll({ order: [['createdAt', 'DESC']] });
    // Mask tokens
    const masked = bots.map(b => {
      const j = b.toJSON();
      j.tokenMasked = j.token ? j.token.slice(0, 6) + '••••••' + j.token.slice(-4) : '';
      return j;
    });
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
};

export const getBotFull = async (req, res) => {
  try {
    const bot = await BotConfig.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Не найден' });
    res.json(bot);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка' });
  }
};

export const createBot = async (req, res) => {
  try {
    const { name, token, welcomeMessage } = req.body;
    if (!name || !token) return res.status(400).json({ error: 'Имя и токен обязательны' });

    const bot = await BotConfig.create({ name, token, welcomeMessage, isActive: false, status: 'stopped' });
    res.status(201).json(bot);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания' });
  }
};

export const updateBot = async (req, res) => {
  try {
    const bot = await BotConfig.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Не найден' });

    const { name, token, welcomeMessage } = req.body;
    if (name) bot.name = name;
    if (token) bot.token = token;
    if (welcomeMessage !== undefined) bot.welcomeMessage = welcomeMessage;
    await bot.save();

    res.json(bot);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления' });
  }
};

export const deleteBot = async (req, res) => {
  try {
    const bot = await BotConfig.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Не найден' });

    if (bot.isActive) await stopBot();
    await bot.destroy();

    res.json({ message: 'Удалён' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
};

export const startBotAction = async (req, res) => {
  try {
    // Deactivate all other bots
    await BotConfig.update({ isActive: false, status: 'stopped' }, { where: {} });

    const bot = await BotConfig.findByPk(req.params.id);
    if (!bot) return res.status(404).json({ error: 'Не найден' });

    bot.isActive = true;
    await bot.save();

    const result = await startBotWithConfig(bot);
    if (result) {
      res.json({ message: 'Бот запущен', username: bot.username, status: bot.status });
    } else {
      res.status(500).json({ error: bot.lastError || 'Ошибка запуска' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const stopBotAction = async (req, res) => {
  try {
    await stopBot();
    const bot = await BotConfig.findByPk(req.params.id);
    if (bot) {
      bot.isActive = false;
      bot.status = 'stopped';
      await bot.save();
    }
    res.json({ message: 'Бот остановлен' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка остановки' });
  }
};
