import crypto from 'crypto';
import { Telegraf, Markup } from 'telegraf';
import { User, Shop, Category, Product, ProductItem, ChatMessage, PaymentSystem, BotConfig } from '../models/index.js';
import sequelize from '../config/database.js';
import { purchaseFromBalance } from '../services/purchaseService.js';
import { createDepositOrder } from '../services/depositService.js';

let activeBot = null;
let activeBotId = null;

export function getBot() { return activeBot; }

// ===== Notifications =====
export async function notifyUser(userId, text) {
  if (!activeBot) return;
  try {
    const user = await User.findByPk(userId);
    if (user?.telegramId) {
      await activeBot.telegram.sendMessage(user.telegramId, text, { parse_mode: 'HTML' });
    }
  } catch (err) {
    console.error('TG notify error:', err.message);
  }
}

export async function notifyAdmins(text) {
  if (!activeBot) return;
  try {
    const admins = await User.findAll({ where: { role: ['admin', 'operator'] } });
    for (const a of admins) {
      if (a.telegramId) await activeBot.telegram.sendMessage(a.telegramId, text, { parse_mode: 'HTML' }).catch(() => {});
    }
  } catch {}
}

// ===== Stop running bot =====
export async function stopBot() {
  if (activeBot) {
    activeBot.stop('restart');
    activeBot = null;
  }
  if (activeBotId) {
    await BotConfig.update({ status: 'stopped' }, { where: { id: activeBotId } });
    activeBotId = null;
  }
}

// ===== Start bot from DB config =====
export async function startBotFromDB() {
  const config = await BotConfig.findOne({ where: { isActive: true } });
  if (!config) {
    console.log('No active bot config found');
    return null;
  }
  return startBotWithConfig(config);
}

export async function startBotWithConfig(config) {
  await stopBot();

  try {
    const bot = new Telegraf(config.token);
    const siteUrl = process.env.SITE_URL || 'http://localhost';

    // Get bot info
    const me = await bot.telegram.getMe();
    config.username = me.username;
    config.status = 'running';
    config.lastError = null;
    await config.save();

    setupBotHandlers(bot, siteUrl);

    bot.launch().then(() => {
      console.log(`Telegram bot @${me.username} started`);
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    activeBot = bot;
    activeBotId = config.id;
    return bot;
  } catch (err) {
    config.status = 'error';
    config.lastError = err.message;
    await config.save();
    console.error('Bot start error:', err.message);
    return null;
  }
}

// ===== All bot handlers =====
function setupBotHandlers(bot, siteUrl) {

  // /start
  bot.start(async (ctx) => {
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
      await ctx.reply(
        `🎉 Добро пожаловать в ExShop!\n\nЛогин: <code>${user.username}</code>\nПароль: <code>${password}</code>\n\nСайт: ${siteUrl}`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(`👋 С возвращением, ${user.username}!\nБаланс: <b>${parseFloat(user.balance).toFixed(2)} ₽</b>`, { parse_mode: 'HTML' });
    }
    await ctx.reply('Выберите действие:', Markup.keyboard([
      ['🛍 Каталог', '💰 Баланс'],
      ['📦 Мои заказы', '💳 Пополнить'],
      ['💬 Поддержка', '👤 Профиль'],
    ]).resize());
  });

  // /link
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

  // Каталог
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

  // Покупка (uses shared purchaseService)
  bot.action(/^buy_(\d+)_(\d+)$/, async (ctx) => {
    const user = await User.findOne({ where: { telegramId: ctx.from.id } });
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

  // Баланс
  bot.hears('💰 Баланс', async (ctx) => {
    const user = await User.findOne({ where: { telegramId: ctx.from.id } });
    if (!user) return ctx.reply('/start');
    ctx.reply(`💰 Баланс: <b>${parseFloat(user.balance).toFixed(2)} ₽</b>`, { parse_mode: 'HTML' });
  });

  // Пополнение
  bot.hears('💳 Пополнить', async (ctx) => {
    await ctx.reply('Выберите сумму:', Markup.inlineKeyboard([
      [Markup.button.callback('500 ₽', 'dep_500'), Markup.button.callback('1000 ₽', 'dep_1000')],
      [Markup.button.callback('2000 ₽', 'dep_2000'), Markup.button.callback('5000 ₽', 'dep_5000')],
    ]));
  });

  bot.action(/^dep_(\d+)$/, async (ctx) => {
    const user = await User.findOne({ where: { telegramId: ctx.from.id } });
    if (!user) return ctx.answerCbQuery('/start');
    const amount = parseInt(ctx.match[1]);
    try {
      const result = await createDepositOrder({ userId: user.id, amount, httpFallbackUrl: siteUrl });

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

  // Заказы
  bot.hears('📦 Мои заказы', async (ctx) => {
    const user = await User.findOne({ where: { telegramId: ctx.from.id } });
    if (!user) return ctx.reply('/start');
    const orders = await Order.findAll({ where: { userId: user.id }, include: [{ model: Product, as: 'product', attributes: ['name'] }], order: [['createdAt', 'DESC']], limit: 10 });
    if (!orders.length) return ctx.reply('📦 Нет заказов');
    const emoji = { delivered: '✅', pending: '⏳', cancelled: '❌', refunded: '↩️' };
    let text = '📦 <b>Заказы:</b>\n\n';
    orders.forEach(o => { text += `${emoji[o.status] || '•'} #${o.id} ${o.product?.name} — ${o.totalPrice} ₽\n`; });
    ctx.reply(text, { parse_mode: 'HTML' });
  });

  // Поддержка
  bot.hears('💬 Поддержка', (ctx) => ctx.reply('Напишите сообщение — оно уйдёт в поддержку.'));

  // Профиль
  bot.hears('👤 Профиль', async (ctx) => {
    const user = await User.findOne({ where: { telegramId: ctx.from.id } });
    if (!user) return ctx.reply('/start');
    ctx.reply(`👤 <b>${user.username}</b>\n💰 ${parseFloat(user.balance).toFixed(2)} ₽\n${user.personalDiscount ? `🏷 Скидка: ${user.personalDiscount}%\n` : ''}`, { parse_mode: 'HTML' });
  });

  // Любой текст → поддержка
  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    if (['🛍', '💰', '📦', '💳', '💬', '👤'].some(e => ctx.message.text.startsWith(e))) return;
    const user = await User.findOne({ where: { telegramId: ctx.from.id } });
    if (!user) return;
    await ChatMessage.create({ userId: user.id, message: ctx.message.text, isFromOperator: false });
    ctx.reply('💬 Отправлено в поддержку.');
    notifyAdmins(`💬 <b>${user.username}</b>: ${ctx.message.text}`);
  });
}
