import crypto from 'crypto';
import { PaymentSystem, DepositOrder, User, BalanceTransaction } from '../models/index.js';
import sequelize from '../config/database.js';
import { notifyUser } from '../bot/index.js';

/**
 * Call payment system API.
 */
async function callApi(ps, method, path, body = null) {
  const opts = {
    method,
    headers: { 'X-Api-Key': ps.apiKey, 'X-Api-Sign': ps.apiSign, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${ps.baseUrl}${path}`, opts);
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!resp.ok || data.error) {
    const msg = data.error?.message || data.error || data.message || `API error ${resp.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data;
}

/**
 * Resolve webhook base URL (env > fallback).
 */
function getWebhookBaseUrl(fallback) {
  return process.env.WEBHOOK_BASE_URL || fallback || 'http://localhost:4000';
}

/**
 * Unwrap an order payload from a payment system response envelope.
 */
function unwrapOrder(data) {
  return data.order || data;
}

/**
 * Create a deposit order. Tries payment systems by priority.
 * Returns { deposit, paymentUrl, requisite, paymentData } or throws.
 */
export async function createDepositOrder({ userId, amount, channel, httpFallbackUrl }) {
  const systems = await PaymentSystem.findAll({ where: { isActive: true }, order: [['priority', 'ASC']] });
  if (!systems.length) throw new Error('Нет доступных платёжных систем');

  const baseUrl = getWebhookBaseUrl(httpFallbackUrl);
  let lastError = null;

  const parsedAmount = parseFloat(amount);

  for (const ps of systems) {
    try {
      const selectedChannel = channel || ps.channels?.[0] || 'card';
      const reference = `dep-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      const apiResponse = await callApi(ps, 'POST', '/orders', {
        direction: 'inbound',
        amount: parsedAmount,
        currency: 'RUB',
        reference,
        channel: selectedChannel,
        webhook_url: `${baseUrl}/api/payments/webhook/${ps.code}`,
      });

      const order = unwrapOrder(apiResponse);
      const paymentUrl = order.hosted_url || order.payment_url || apiResponse.url || null;
      const externalId = order.order_no || order.id || null;

      const deposit = await DepositOrder.create({
        userId, paymentSystemId: ps.id, reference,
        externalOrderId: externalId, amount: parsedAmount,
        channel: selectedChannel, status: 'pending',
        paymentUrl, paymentData: apiResponse,
      });

      return { deposit, paymentUrl, requisite: order.requisite || null, paymentData: apiResponse };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw new Error(`Все платёжные системы недоступны: ${lastError?.message || 'неизвестная ошибка'}`);
}

/**
 * Credit deposit to user balance. Uses transaction to prevent double-credit.
 * Returns true if credited, false if already processed.
 */
export async function creditDeposit(deposit, paymentSystemName) {
  const t = await sequelize.transaction();
  let credited = null;
  try {
    // Re-fetch with lock to prevent race condition
    const fresh = await DepositOrder.findByPk(deposit.id, { transaction: t, lock: true });
    if (!fresh || fresh.status !== 'pending') {
      await t.rollback();
      return false; // Already processed
    }

    const user = await User.findByPk(fresh.userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return false;
    }

    const amount = parseFloat(fresh.amount);
    fresh.status = 'paid';
    await fresh.save({ transaction: t });

    await user.increment('balance', { by: amount, transaction: t });
    await user.reload({ transaction: t });

    await BalanceTransaction.create({
      userId: user.id,
      amount,
      type: 'deposit',
      description: `Пополнение через ${paymentSystemName || 'платёжку'} (${fresh.channel})`,
    }, { transaction: t });

    await t.commit();
    credited = { userId: fresh.userId, amount, newBalance: parseFloat(user.balance) };
  } catch (err) {
    await t.rollback();
    throw err;
  }

  // Side-effect outside the transaction: a notify failure must not roll back a committed credit.
  notifyUser(credited.userId, `✅ Баланс пополнен на <b>${credited.amount} ₽</b>\nНовый баланс: <b>${credited.newBalance.toFixed(2)} ₽</b>`);
  return true;
}

/**
 * Check deposit status via payment system API polling.
 */
export async function pollDepositStatus(deposit, paymentSystem) {
  if (!deposit.externalOrderId) return false;
  try {
    const data = await callApi(paymentSystem, 'GET', `/orders/${deposit.externalOrderId}`);
    const order = unwrapOrder(data);
    const paidStatuses = ['paid', 'completed', 'success', 'done', 'settled'];
    return paidStatuses.includes((order.state || order.status || '').toLowerCase());
  } catch {
    return false;
  }
}
