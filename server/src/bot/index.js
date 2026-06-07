import crypto from 'crypto';
import { Telegraf, Markup } from 'telegraf';
import { User, Shop, Category, Product, ProductItem, Order, ChatMessage, BotConfig, PaymentSystem } from '../models/index.js';
import sequelize from '../config/database.js';
import { purchaseFromBalance } from '../services/purchaseService.js';
import { createDepositOrder } from '../services/depositService.js';
import { getAvailableCryptoChannels, createCryptoDeposit } from '../services/cryptoService.js';

const CHANNEL_LABELS = {
  card: '💳 Банковская карта', sbp: '📱 СБП', qr: '📷 QR-код',
  sim: '📞 SIM / телефон', cash: '💵 Наличные', transgran: '🌍 Трансграничный',
  alfa2alfa: '🏦 Альфа-Банк', tbank2tbank: '🏦 Т-Банк',
  sber2sber: '🏦 Сбербанк', vtb2vtb: '🏦 ВТБ',
};
const CRYPTO_LABELS = { btc: 'Bitcoin (BTC)', ltc: 'Litecoin (LTC)', usdt: 'USDT (TRC-20)' };

// Map of active bots: botConfigId -> { bot, config }
const activeBots = new Map();

export function getBot() {
  const first = activeBots.values().next().value;
  return first?.bot || null;
}

// ===== Notifications =====
export async function notifyUser(userId, text) {
  const bot = getBot();
  if (!bot) return;
  try {
    const user = await User.findByPk(userId);
    if (user?.telegramId) {
      await bot.telegram.sendMessage(user.telegramId, text, { parse_mode: 'HTML' });
    }
  } catch (err) {
    console.error('TG notify error:', err.message);
  }
}

export async function notifyAdmins(text) {
  const bot = getBot();
  if (!bot) return;
  try {
    const admins = await User.findAll({ where: { role: ['admin', 'operator'] } });
    for (const a of admins) {
      if (a.telegramId) await bot.telegram.sendMessage(a.telegramId, text, { parse_mode: 'HTML' }).catch(() => {});
    }
  } catch {}
}

// ===== Stop bot by config id =====
export async function stopBot(configId) {
  const entry = activeBots.get(configId);
  if (entry) {
    entry.bot.stop('restart');
    activeBots.delete(configId);
  }
  await BotConfig.update({ status: 'stopped', isActive: false }, { where: { id: configId } });
}

// ===== Start all active bots from DB =====
export async function startBotFromDB() {
  const configs = await BotConfig.findAll({ where: { isActive: true } });
  if (!configs.length) {
    console.log('No active bot config found');
    return null;
  }
  for (const config of configs) {
    await startBotWithConfig(config);
  }
  return getBot();
}

export async function startBotWithConfig(config) {
  if (activeBots.has(config.id)) {
    activeBots.get(config.id).bot.stop('restart');
    activeBots.delete(config.id);
  }

  try {
    const bot = new Telegraf(config.token);
    const siteUrl = process.env.SITE_URL || 'http://localhost';

    const me = await bot.telegram.getMe();
    config.username = me.username;
    config.status = 'running';
    config.lastError = null;
    await config.save();

    if (config.types.includes('redirector')) {
      setupRedirectorHandlers(bot, siteUrl, config);
    } else {
      setupShopHandlers(bot, siteUrl);
    }

    bot.launch().then(() => {
      console.log(`Telegram bot @${me.username} started (types: ${config.types.join(', ')})`);
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    activeBots.set(config.id, { bot, config });
    return bot;
  } catch (err) {
    config.status = 'error';
    config.lastError = err.message;
    await config.save();
    console.error('Bot start error:', err.message);
    return null;
  }
}

// ===== Shared: find or create user =====
async function getUser(ctx) {
  return User.findOne({ where: { telegramId: ctx.from.id } });
}

async function ensureUser(ctx) {
  const tgId = ctx.from.id;
  const tgUsername = ctx.from.username || '';
  let user = await User.findOne({ where: { telegramId: tgId } });

  if (!user) {
    const username = tgUsername || `tg_${tgId}`;
    const password = crypto.randomBytes(8).toString('hex');
    try {
      user = await User.create({ username, password, telegramId: tgId, telegramUsername: tgUsername });
    } catch {
      const uniq = `${username}_${crypto.randomBytes(3).toString('hex')}`;
      user = await User.create({ username: uniq, password, telegramId: tgId, telegramUsername: tgUsername });
    }
    user._isNew = true;
    user._password = password;
  }
  return user;
}

// ===== Shared: text -> support =====
function setupSupportTextHandler(bot, menuEmojis) {
  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    if (menuEmojis.some(e => ctx.message.text.startsWith(e))) return;
    const user = await getUser(ctx);
    if (!user) return;
    await ChatMessage.create({ userId: user.id, message: ctx.message.text, isFromOperator: false });
    ctx.reply('💬 Отправлено в поддержку.');
    notifyAdmins(`💬 <b>${user.username}</b>: ${ctx.message.text}`);
  });
}

// ===== REDIRECTOR BOT HANDLERS =====
function setupRedirectorHandlers(bot, siteUrl, botConfig) {

  bot.start(async (ctx) => {
    await ensureUser(ctx);
    const welcome = botConfig.welcomeMessage || 'Добро пожаловать! Выберите действие:';
    await ctx.reply(welcome, Markup.keyboard([
      ['🛍 Магазины', '💬 Поддержка'],
      ['🤖 Создать личного бота'],
    ]).resize());
  });

  bot.hears('🛍 Магазины', async (ctx) => {
    const shopBots = await BotConfig.findAll({ where: { status: 'running' } });
    const shops = shopBots.filter(b => b.types.includes('shop') || b.types.includes('client'));

    if (!shops.length) return ctx.reply('Магазинов пока нет');

    const btns = shops.map(s => {
      if (s.username) return [Markup.button.url(s.name, `https://t.me/${s.username}`)];
      return [Markup.button.callback(s.name, `noop_${s.id}`)];
    });
    await ctx.reply('Доступные магазины:', Markup.inlineKeyboard(btns));
  });

  bot.hears('💬 Поддержка', (ctx) => ctx.reply('Напишите сообщение — оно будет отправлено в поддержку.'));

  bot.hears('🤖 Создать личного бота', async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.reply('Нажмите /start для регистрации.');

    const existing = await BotConfig.findOne({ where: { ownerTelegramId: ctx.from.id } });
    if (existing) {
      let text = `У вас уже есть бот: <b>${existing.name}</b>`;
      if (existing.username) text += ` (@${existing.username})`;
      text += `\nСтатус: ${existing.status}`;
      return ctx.reply(text, { parse_mode: 'HTML' });
    }

    await ctx.reply(
      '🤖 <b>Создание личного бота</b>\n\n' +
      '1. Откройте @BotFather в Telegram\n' +
      '2. Отправьте /newbot и следуйте инструкциям\n' +
      '3. Скопируйте полученный токен\n' +
      '4. Отправьте его сюда:\n\n' +
      '<code>/newbot Название токен</code>',
      { parse_mode: 'HTML' }
    );
  });

  bot.command('newbot', async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.reply('Нажмите /start для регистрации.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) {
      return ctx.reply('Использование: /newbot <название> <токен>');
    }

    const name = args[0];
    const token = args.slice(1).join(' ').trim();

    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      return ctx.reply('❌ Неверный формат токена.');
    }

    const existing = await BotConfig.findOne({ where: { ownerTelegramId: ctx.from.id } });
    if (existing) {
      return ctx.reply('❌ У вас уже есть бот. Один пользователь — один бот.');
    }

    try {
      const testBot = new Telegraf(token);
      const me = await testBot.telegram.getMe();

      const newConfig = await BotConfig.create({
        name,
        token,
        username: me.username,
        types: ['client'],
        ownerTelegramId: ctx.from.id,
        isActive: true,
        status: 'stopped',
      });

      const started = await startBotWithConfig(newConfig);
      if (started) {
        await ctx.reply(
          `✅ Бот <b>${name}</b> (@${me.username}) создан и запущен!\n\nhttps://t.me/${me.username}`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply(`⚠️ Бот создан, но не запустился: ${newConfig.lastError || 'неизвестная ошибка'}`);
      }
    } catch (err) {
      ctx.reply(`❌ ${err.message}`);
    }
  });

  setupSupportTextHandler(bot, ['🛍', '💬', '🤖']);
}

// ===== SHOP / CLIENT BOT HANDLERS =====
function setupShopHandlers(bot, siteUrl) {

  bot.start(async (ctx) => {
    const user = await ensureUser(ctx);
    if (user._isNew) {
      await ctx.reply(
        `🎉 Добро пожаловать!\n\nЛогин: <code>${user.username}</code>\nПароль: <code>${user._password}</code>\n\nСайт: ${siteUrl}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`👋 С возвращением, ${user.username}!\nБаланс: <b>${parseFloat(user.balance).toFixed(2)} ₽</b>`, { parse_mode: 'HTML' });
    }
    await ctx.reply('Выберите действие:', Markup.keyboard([
      ['🛍 Каталог', '📦 Мои заказы'],
      ['💬 Поддержка', '👤 Профиль'],
    ]).resize());
  });

  bot.command('link', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) return ctx.reply('Использование: /link <логин> <пароль>');
    const user = await User.findOne({ where: { username: args[0] } });
    if (!user) return ctx.reply('❌ Пользователь не найден');
    const valid = await user.checkPassword(args[1]);
    if (!valid) return ctx.reply('❌ Неверный пароль');
    user.telegramId = ctx.from.id;
    user.telegramUsername = ctx.from.username || '';
    await user.save();
    ctx.reply(`✅ Аккаунт ${user.username} привязан!`);
  });

  bot.hears('🛍 Каталог', async (ctx) => {
    const shops = await Shop.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC']] });
    if (!shops.length) return ctx.reply('Витрин пока нет');
    await ctx.reply('Выберите витрину:', Markup.inlineKeyboard(shops.map(s => [Markup.button.callback(s.name, `shop_${s.id}`)])));
  });

  bot.action(/^shop_(\d+)$/, async (ctx) => {
    const cats = await Category.findAll({ where: { shopId: ctx.match[1], isActive: true }, order: [['sortOrder', 'ASC']] });
    if (!cats.length) return ctx.answerCbQuery('Нет категорий');
    await ctx.editMessageText('Выберите категорию:', Markup.inlineKeyboard(cats.map(c => [Markup.button.callback(c.name, `cat_${c.id}`)])));
    ctx.answerCbQuery();
  });

  bot.action(/^cat_(\d+)$/, async (ctx) => {
    const products = await Product.findAll({
      where: { categoryId: ctx.match[1], isActive: true },
      order: [['sortOrder', 'ASC']],
      attributes: { include: [[sequelize.literal(`(SELECT COUNT(*) FROM product_items WHERE product_items."productId" = "Product"."id" AND product_items."isSold" = false)`), 'stockCount']] },
    });
    if (!products.length) return ctx.answerCbQuery('Нет товаров');
    await ctx.editMessageText('Товары:', Markup.inlineKeyboard(products.map(p => [Markup.button.callback(`${p.name} — ${p.price}₽ (${p.dataValues.stockCount} шт)`, `prod_${p.id}`)])));
    ctx.answerCbQuery();
  });

  bot.action(/^prod_(\d+)$/, async (ctx) => {
    const p = await Product.findByPk(ctx.match[1]);
    if (!p) return ctx.answerCbQuery('Не найден');
    const stock = await ProductItem.count({ where: { productId: p.id, isSold: false } });
    let text = `<b>${p.name}</b>\n`;
    if (p.shortDescription) text += `${p.shortDescription}\n`;
    text += `\n💰 ${p.price} ₽`;
    if (p.oldPrice) text += ` <s>${p.oldPrice} ₽</s>`;
    text += `\n📦 В наличии: ${stock}`;
    const btns = [];
    if (stock > 0) {
      btns.push([Markup.button.callback('🛒 Купить 1 шт', `buy_${p.id}_1`)]);
      if (stock >= 5) btns.push([Markup.button.callback('🛒 Купить 5 шт', `buy_${p.id}_5`)]);
    }
    btns.push([Markup.button.callback('« Назад', `cat_${p.categoryId}`)]);
    await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) });
    ctx.answerCbQuery();
  });

  bot.action(/^buy_(\d+)_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.answerCbQuery('Нажмите /start');
    const productId = ctx.match[1];
    const qty = ctx.match[2];
    const product = await Product.findByPk(productId);
    if (!product) return ctx.answerCbQuery('Товар не найден');

    const total = (parseFloat(product.price) * parseInt(qty)).toFixed(2);
    const btns = [
      [Markup.button.callback(`💰 С баланса (${parseFloat(user.balance).toFixed(2)} ₽)`, `pay_balance_${productId}_${qty}`)],
    ];

    try {
      const cryptoChannels = await getAvailableCryptoChannels();
      const icons = { btc: '₿', ltc: 'Ł', usdt: '₮' };
      for (const ch of cryptoChannels) {
        btns.push([Markup.button.callback(`${icons[ch.currency] || '🪙'} ${ch.label}`, `pay_crypto_${ch.currency}_${productId}_${qty}`)]);
      }
    } catch {}

    btns.push([Markup.button.callback('💳 Рубли (карта/СБП)', `pay_fiat_${productId}_${qty}`)]);
    btns.push([Markup.button.callback('« Назад', `prod_${productId}`)]);

    await ctx.editMessageText(
      `🛒 <b>${product.name}</b> x${qty}\n💰 Сумма: <b>${total} ₽</b>\n\nВыберите способ оплаты:`,
      { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) }
    );
    ctx.answerCbQuery();
  });

  bot.action(/^pay_balance_(\d+)_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.answerCbQuery('Нажмите /start');
    try {
      const result = await purchaseFromBalance({
        userId: user.id,
        productId: parseInt(ctx.match[1]),
        quantity: parseInt(ctx.match[2]),
      });
      await ctx.reply(
        `✅ <b>${result.product.name}</b> x${result.order.quantity}\nСписано: ${result.totalPrice.toFixed(2)} ₽\n\n📋 Данные:\n<code>${result.deliveredContent}</code>`,
        { parse_mode: 'HTML' }
      );
      ctx.answerCbQuery('Куплено!');
    } catch (err) {
      ctx.reply(`❌ ${err.message}`);
      ctx.answerCbQuery();
    }
  });

  bot.action(/^pay_crypto_(\w+)_(\d+)_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.answerCbQuery('Нажмите /start');
    const currency = ctx.match[1];
    const product = await Product.findByPk(ctx.match[2]);
    if (!product) return ctx.answerCbQuery('Товар не найден');

    const amountRub = parseFloat(product.price) * parseInt(ctx.match[3]);
    try {
      const { deposit, rate } = await createCryptoDeposit({ userId: user.id, currency, amountRub });
      await ctx.reply(
        `🪙 <b>Оплата ${currency.toUpperCase()}</b>\n\n` +
        `Товар: ${product.name} x${ctx.match[3]}\n` +
        `Сумма: <b>${amountRub} ₽</b>\n\n` +
        `Переведите точно:\n<code>${deposit.amountCrypto}</code> ${currency.toUpperCase()}\n\n` +
        `На кошелёк:\n<code>${deposit.walletAddress}</code>\n\n` +
        `Курс: 1 ${currency.toUpperCase()} = ${rate.toLocaleString('ru')} ₽\n` +
        `⏳ Действует 1 час`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      ctx.reply(`❌ ${err.message}`);
    }
    ctx.answerCbQuery();
  });

  bot.action(/^pay_fiat_(\d+)_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.answerCbQuery('Нажмите /start');
    const product = await Product.findByPk(ctx.match[1]);
    if (!product) return ctx.answerCbQuery('Товар не найден');

    const amount = parseFloat(product.price) * parseInt(ctx.match[2]);
    try {
      const result = await createDepositOrder({ userId: user.id, amount, httpFallbackUrl: siteUrl });

      let text = `💳 <b>Оплата рублями</b>\n\nТовар: ${product.name} x${ctx.match[2]}\nСумма: <b>${amount} ₽</b>\n\n`;
      if (result.requisite) {
        if (result.requisite.bank) text += `🏦 ${result.requisite.bank}\n`;
        if (result.requisite.number) text += `📱 <code>${result.requisite.number}</code>\n`;
        if (result.requisite.holder) text += `👤 ${result.requisite.holder}\n`;
      }
      text += '\nПосле оплаты баланс пополнится автоматически.';

      const btns = result.paymentUrl ? [[Markup.button.url('🔗 Оплатить', result.paymentUrl)]] : [];
      await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) });
    } catch (err) {
      ctx.reply(`❌ ${err.message}`);
    }
    ctx.answerCbQuery();
  });

  bot.action('deposit_menu', async (ctx) => {
    await ctx.reply('Выберите сумму:', Markup.inlineKeyboard([
      [Markup.button.callback('500 ₽', 'dep_500'), Markup.button.callback('1000 ₽', 'dep_1000')],
      [Markup.button.callback('2000 ₽', 'dep_2000'), Markup.button.callback('5000 ₽', 'dep_5000')],
    ]));
    ctx.answerCbQuery();
  });

  bot.action(/^dep_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.answerCbQuery('/start');
    const amount = parseInt(ctx.match[1]);

    try {
      const [systems, cryptoChannels] = await Promise.all([
        PaymentSystem.findAll({ where: { isActive: true }, order: [['priority', 'ASC']] }),
        getAvailableCryptoChannels(),
      ]);

      const btns = [];

      // Fiat payment channels (deduplicate)
      const seenChannels = new Set();
      for (const ps of systems) {
        for (const ch of (ps.channels || [])) {
          if (!seenChannels.has(ch)) {
            seenChannels.add(ch);
            btns.push([Markup.button.callback(CHANNEL_LABELS[ch] || ch, `depf_${amount}_${ch}`)]);
          }
        }
      }

      // Crypto channels
      for (const cc of cryptoChannels) {
        const icon = { btc: '₿', ltc: '🪙', usdt: '💲' }[cc.currency] || '🪙';
        btns.push([Markup.button.callback(`${icon} ${CRYPTO_LABELS[cc.currency] || cc.label}`, `depc_${amount}_${cc.currency}`)]);
      }

      if (!btns.length) {
        await ctx.reply('❌ Нет доступных способов оплаты');
      } else {
        await ctx.reply(`Сумма: <b>${amount} ₽</b>\nВыберите способ оплаты:`, {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard(btns),
        });
      }
    } catch (err) {
      ctx.reply(`❌ ${err.message}`);
    }
    ctx.answerCbQuery();
  });

  // Fiat deposit via payment system
  bot.action(/^depf_(\d+)_(.+)$/, async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.answerCbQuery('/start');
    const amount = parseInt(ctx.match[1]);
    const channel = ctx.match[2];
    try {
      const result = await createDepositOrder({ userId: user.id, amount, channel, httpFallbackUrl: siteUrl });

      let text = `💳 Пополнение <b>${amount} ₽</b>\n\n`;
      if (result.requisite) {
        if (result.requisite.bank) text += `🏦 ${result.requisite.bank}\n`;
        if (result.requisite.number) text += `📱 <code>${result.requisite.number}</code>\n`;
        if (result.requisite.holder) text += `👤 ${result.requisite.holder}\n`;
        text += `\n💰 Сумма: <b>${amount} ₽</b>\n`;
      }
      text += '\nПосле оплаты баланс пополнится автоматически.';

      const btns = result.paymentUrl ? [[Markup.button.url('🔗 Оплатить', result.paymentUrl)]] : [];
      await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(btns) });
    } catch (err) {
      ctx.reply(`❌ ${err.message}`);
    }
    ctx.answerCbQuery();
  });

  // Crypto deposit
  bot.action(/^depc_(\d+)_(.+)$/, async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.answerCbQuery('/start');
    const amount = parseInt(ctx.match[1]);
    const currency = ctx.match[2];
    try {
      const { deposit, rate } = await createCryptoDeposit({ userId: user.id, currency, amountRub: amount });

      let text = `🪙 <b>${CRYPTO_LABELS[currency] || currency.toUpperCase()}</b>\n\n`;
      text += `💰 Сумма: <b>${amount} ₽</b>\n`;
      text += `📊 Курс: 1 ${currency.toUpperCase()} = ${rate.toLocaleString('ru')} ₽\n`;
      text += `\n💎 К оплате: <b>${deposit.amountCrypto} ${currency.toUpperCase()}</b>\n\n`;
      text += `📋 Кошелёк:\n<code>${deposit.walletAddress}</code>\n\n`;
      text += `⏱ Депозит действителен 1 час.\nПосле отправки баланс пополнится автоматически.`;

      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch (err) {
      ctx.reply(`❌ ${err.message}`);
    }
    ctx.answerCbQuery();
  });

  bot.hears('📦 Мои заказы', async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.reply('/start');
    const orders = await Order.findAll({ where: { userId: user.id }, include: [{ model: Product, as: 'product', attributes: ['name'] }], order: [['createdAt', 'DESC']], limit: 10 });
    if (!orders.length) return ctx.reply('📦 Нет заказов');
    const emoji = { delivered: '✅', pending: '⏳', cancelled: '❌', refunded: '↩️' };
    let text = '📦 <b>Заказы:</b>\n\n';
    orders.forEach(o => { text += `${emoji[o.status] || '•'} #${o.id} ${o.product?.name} — ${o.totalPrice} ₽\n`; });
    ctx.reply(text, { parse_mode: 'HTML' });
  });

  bot.hears('💬 Поддержка', (ctx) => ctx.reply('Напишите сообщение — оно уйдёт в поддержку.'));

  bot.hears('👤 Профиль', async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return ctx.reply('/start');
    const ordersCount = await Order.count({ where: { userId: user.id } });
    let text = `👤 <b>${user.username}</b>\n\n`;
    text += `💰 Баланс: <b>${parseFloat(user.balance).toFixed(2)} ₽</b>\n`;
    text += `📦 Заказов: ${ordersCount}\n`;
    if (user.personalDiscount) text += `🏷 Скидка: ${user.personalDiscount}%\n`;
    await ctx.reply(text, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('💳 Пополнить баланс', 'deposit_menu')]]),
    });
  });

  setupSupportTextHandler(bot, ['🛍', '📦', '💬', '👤']);
}
