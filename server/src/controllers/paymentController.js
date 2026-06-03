import { PaymentSystem, PaymentCallback, DepositOrder, User } from '../models/index.js';
import { createDepositOrder, creditDeposit, pollDepositStatus } from '../services/depositService.js';

// ===== CLIENT: Create deposit =====
export const createDeposit = async (req, res) => {
  try {
    const { amount, channel } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Укажите сумму' });

    const result = await createDepositOrder({
      userId: req.user.id,
      amount: parseFloat(amount),
      channel,
      httpFallbackUrl: `${req.protocol}://${req.get('host')}`,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== CLIENT: Get available channels =====
export const getPaymentChannels = async (req, res) => {
  try {
    const systems = await PaymentSystem.findAll({
      where: { isActive: true },
      order: [['priority', 'ASC']],
      attributes: ['id', 'name', 'code', 'channels', 'minAmount', 'maxAmount'],
    });

    const channels = {};
    for (const ps of systems) {
      for (const ch of (ps.channels || [])) {
        if (!channels[ch]) {
          channels[ch] = { channel: ch, systemName: ps.name, systemCode: ps.code, minAmount: ps.minAmount, maxAmount: ps.maxAmount };
        }
      }
    }
    res.json(Object.values(channels));
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки каналов оплаты' });
  }
};

// ===== CLIENT: My deposits =====
export const getMyDeposits = async (req, res) => {
  try {
    const deposits = await DepositOrder.findAll({
      where: { userId: req.user.id },
      include: [{ model: PaymentSystem, as: 'paymentSystem', attributes: ['name', 'code'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки пополнений' });
  }
};

// ===== CLIENT: Check deposit status (polling) =====
export const checkDepositStatus = async (req, res) => {
  try {
    const deposit = await DepositOrder.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: PaymentSystem, as: 'paymentSystem' }],
    });
    if (!deposit) return res.status(404).json({ error: 'Не найден' });
    if (deposit.status === 'paid') return res.json({ status: 'paid', deposit });

    const ps = deposit.paymentSystem;
    if (ps) {
      const isPaid = await pollDepositStatus(deposit, ps);
      if (isPaid) {
        const credited = await creditDeposit(deposit, ps.name);
        if (credited) {
          await deposit.reload();
          return res.json({ status: 'paid', deposit, message: 'Оплата подтверждена!' });
        }
      }
    }

    res.json({ status: deposit.status, deposit });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка проверки статуса' });
  }
};

// ===== WEBHOOK =====
export const handleWebhook = async (req, res) => {
  try {
    const { code } = req.params;
    const payload = req.body;

    const ps = await PaymentSystem.findOne({ where: { code } });
    if (!ps) return res.status(404).json({ error: 'Payment system not found' });

    // Normalize payload (MoneyBunny wraps in "invoice" or "order")
    const inv = payload.invoice || payload.order || payload;
    const reference = inv.orderId || inv.reference || payload.reference || '';
    const amount = parseFloat(inv.amountRub || inv.amount || payload.amount) || 0;
    const status = inv.status || payload.status || payload.event || 'unknown';
    const channel = inv.paymentMethod || inv.channel || payload.channel || null;
    const externalId = inv.id || payload.id || null;

    const callback = await PaymentCallback.create({
      paymentSystemId: ps.id,
      externalOrderId: externalId,
      reference, amount,
      currency: inv.currency || payload.currency || 'RUB',
      status, channel,
      rawPayload: payload,
      processed: false,
    });

    // Process if paid
    const successStatuses = ['paid', 'completed', 'success', 'done', 'invoice.paid'];
    const eventOrStatus = [status, payload.event || ''].map(s => s.toLowerCase());

    if (eventOrStatus.some(s => successStatuses.includes(s))) {
      const deposit = await DepositOrder.findOne({ where: { reference, status: 'pending' } });
      if (deposit) {
        deposit.externalOrderId = externalId || deposit.externalOrderId;
        await deposit.save();

        const credited = await creditDeposit(deposit, ps.name);
        callback.userId = deposit.userId;
        callback.processed = credited;
        await callback.save();
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
};

// ===== ADMIN: CRUD payment systems =====
export const adminGetPaymentSystems = async (req, res) => {
  try {
    const systems = await PaymentSystem.findAll({
      order: [['priority', 'ASC']],
      include: [{ model: PaymentCallback, as: 'callbacks', attributes: ['id'], required: false }],
    });
    res.json(systems.map(s => ({ ...s.toJSON(), callbackCount: s.callbacks?.length || 0 })));
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки платёжных систем' });
  }
};

export const createPaymentSystem = async (req, res) => {
  try {
    const { name, code, baseUrl, apiKey, apiSign, channels, priority, isActive, minAmount, maxAmount } = req.body;
    const ps = await PaymentSystem.create({ name, code, baseUrl, apiKey, apiSign, channels, priority, isActive, minAmount, maxAmount });
    res.status(201).json(ps);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка создания' });
  }
};

export const updatePaymentSystem = async (req, res) => {
  try {
    const ps = await PaymentSystem.findByPk(req.params.id);
    if (!ps) return res.status(404).json({ error: 'Не найдена' });
    const { name, code, baseUrl, apiKey, apiSign, channels, priority, isActive, minAmount, maxAmount } = req.body;
    await ps.update({ name, code, baseUrl, apiKey, apiSign, channels, priority, isActive, minAmount, maxAmount });
    res.json(ps);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления' });
  }
};

export const deletePaymentSystem = async (req, res) => {
  try {
    await PaymentSystem.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
};

export const getPaymentCallbacks = async (req, res) => {
  try {
    const { systemId } = req.query;
    const where = systemId ? { paymentSystemId: systemId } : {};
    const callbacks = await PaymentCallback.findAll({
      where,
      include: [{ model: PaymentSystem, as: 'paymentSystem', attributes: ['name', 'code'] }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(callbacks);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки колбэков' });
  }
};

export const adminGetDeposits = async (req, res) => {
  try {
    const deposits = await DepositOrder.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] },
        { model: PaymentSystem, as: 'paymentSystem', attributes: ['name', 'code'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки депозитов' });
  }
};
