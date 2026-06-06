import { CryptoDeposit, User, BalanceTransaction, Setting } from '../models/index.js';
import sequelize from '../config/database.js';
import { notifyUser } from '../bot/index.js';

// --- Rate fetching ---

export async function getCryptoRates() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,tether&vs_currencies=rub');
    const data = await res.json();
    return {
      btc: data.bitcoin?.rub || 0,
      ltc: data.litecoin?.rub || 0,
      usdt: data.tether?.rub || 0,
    };
  } catch {
    return { btc: 0, ltc: 0, usdt: 0 };
  }
}

// --- Settings helpers ---

async function getCryptoSettings() {
  const rows = await Setting.findAll();
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  return {
    btc: { address: s.crypto_btc_address || '', confirmations: parseInt(s.crypto_btc_confirmations) || 1 },
    ltc: { address: s.crypto_ltc_address || '', confirmations: parseInt(s.crypto_ltc_confirmations) || 1 },
    usdt: { address: s.crypto_usdt_address || '', confirmations: parseInt(s.crypto_usdt_confirmations) || 1 },
  };
}

// --- Available crypto channels ---

export async function getAvailableCryptoChannels() {
  const [settings, rates] = await Promise.all([getCryptoSettings(), getCryptoRates()]);
  const channels = [];
  if (settings.btc.address) channels.push({ currency: 'btc', label: 'Bitcoin (BTC)', rate: rates.btc });
  if (settings.ltc.address) channels.push({ currency: 'ltc', label: 'Litecoin (LTC)', rate: rates.ltc });
  if (settings.usdt.address) channels.push({ currency: 'usdt', label: 'USDT (TRC-20)', rate: rates.usdt });
  return channels;
}

// --- Create crypto deposit ---

export async function createCryptoDeposit({ userId, currency, amountRub }) {
  const settings = await getCryptoSettings();
  const wallet = settings[currency];
  if (!wallet?.address) throw Object.assign(new Error(`Кошелёк ${currency.toUpperCase()} не настроен`), { status: 400 });

  const rates = await getCryptoRates();
  const rate = rates[currency];
  if (!rate) throw Object.assign(new Error(`Не удалось получить курс ${currency.toUpperCase()}`), { status: 500 });

  // Calculate crypto amount with small random offset to make amount unique (for tx matching)
  const baseAmount = amountRub / rate;
  const offset = Math.floor(Math.random() * 900 + 100); // 100-999
  const decimals = currency === 'usdt' ? 2 : 8;
  const amountCrypto = parseFloat((baseAmount + offset / Math.pow(10, decimals + 3)).toFixed(decimals));

  const deposit = await CryptoDeposit.create({
    userId,
    currency,
    amountCrypto,
    amountRub,
    walletAddress: wallet.address,
    requiredConfirmations: wallet.confirmations,
    status: 'pending',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  return { deposit, rate };
}

// --- Helpers ---

function findMatchingTx(txs, amountCrypto) {
  const target = parseFloat(amountCrypto);
  const tolerance = target * 0.01;
  return txs.find(tx => Math.abs(tx.amount - target) <= tolerance);
}

// --- Blockchain checkers ---

async function getBtcTipHeight() {
  try {
    const res = await fetch('https://blockstream.info/api/blocks/tip/height');
    return parseInt(await res.text()) || 0;
  } catch { return 0; }
}

async function checkBtcTransactions(address) {
  try {
    const [txRes, tipHeight] = await Promise.all([
      fetch(`https://blockstream.info/api/address/${address}/txs`),
      getBtcTipHeight(),
    ]);
    const txs = await txRes.json();
    return txs.map(tx => {
      const output = tx.vout.find(v => v.scriptpubkey_address === address);
      const confs = tx.status?.confirmed && tx.status.block_height && tipHeight
        ? tipHeight - tx.status.block_height + 1
        : 0;
      return {
        txHash: tx.txid,
        amount: output ? output.value / 1e8 : 0,
        confirmations: confs,
        confirmed: tx.status?.confirmed || false,
      };
    });
  } catch { return []; }
}

async function checkLtcTransactions(address) {
  try {
    const res = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}?limit=20`);
    const data = await res.json();
    return (data.txrefs || []).map(tx => ({
      txHash: tx.tx_hash,
      amount: tx.value / 1e8,
      confirmations: tx.confirmations || 0,
      confirmed: (tx.confirmations || 0) > 0,
    }));
  } catch { return []; }
}

async function checkUsdtTransactions(address) {
  try {
    const res = await fetch(`https://apilist.tronscanapi.com/api/token_trc20/transfers?relatedAddress=${address}&limit=20&start=0&direction=2`);
    const data = await res.json();
    return (data.token_transfers || []).map(tx => ({
      txHash: tx.transaction_id,
      amount: parseInt(tx.quant || '0') / 1e6,
      confirmations: tx.confirmed ? 20 : 0,
      confirmed: tx.confirmed || false,
    }));
  } catch { return []; }
}

const checkers = { btc: checkBtcTransactions, ltc: checkLtcTransactions, usdt: checkUsdtTransactions };

// --- Poll and credit ---

export async function pollCryptoDeposits() {
  const pending = await CryptoDeposit.findAll({
    where: { status: ['pending', 'confirming'] },
  });

  for (const deposit of pending) {
    // Check expiry
    if (new Date() > new Date(deposit.expiresAt) && deposit.status === 'pending') {
      deposit.status = 'expired';
      await deposit.save();
      continue;
    }

    const checker = checkers[deposit.currency];
    if (!checker) continue;

    try {
      const txs = await checker(deposit.walletAddress);
      const match = findMatchingTx(txs, deposit.amountCrypto);

      if (!match) continue;

      deposit.txHash = match.txHash;
      deposit.confirmations = match.confirmations;

      if (match.confirmations >= deposit.requiredConfirmations) {
        await creditCryptoDeposit(deposit);
      } else {
        deposit.status = 'confirming';
        await deposit.save();
      }
    } catch {
      // Skip on error, try next poll
    }
  }
}

async function creditCryptoDeposit(deposit) {
  const t = await sequelize.transaction();
  try {
    const fresh = await CryptoDeposit.findByPk(deposit.id, { lock: true, transaction: t });
    if (fresh.status === 'paid') { await t.rollback(); return; }

    fresh.status = 'paid';
    await fresh.save({ transaction: t });

    const user = await User.findByPk(fresh.userId, { transaction: t });
    await user.increment('balance', { by: parseFloat(fresh.amountRub), transaction: t });

    await BalanceTransaction.create({
      userId: fresh.userId,
      amount: parseFloat(fresh.amountRub),
      type: 'deposit',
      description: `Крипто-пополнение ${fresh.currency.toUpperCase()} (${fresh.amountCrypto})`,
    }, { transaction: t });

    await t.commit();

    const newBalance = parseFloat(user.balance) + parseFloat(fresh.amountRub);
    notifyUser(fresh.userId, `✅ Крипто-депозит подтверждён!\n${fresh.amountCrypto} ${fresh.currency.toUpperCase()} → ${fresh.amountRub} ₽\nБаланс: ${newBalance.toFixed(2)} ₽`);
  } catch {
    await t.rollback();
  }
}

// --- Check single deposit ---

export async function checkSingleCryptoDeposit(depositId) {
  const deposit = await CryptoDeposit.findByPk(depositId);
  if (!deposit || deposit.status === 'paid') return deposit;

  const checker = checkers[deposit.currency];
  if (!checker) return deposit;

  const txs = await checker(deposit.walletAddress);
  const match = findMatchingTx(txs, deposit.amountCrypto);

  if (match) {
    deposit.txHash = match.txHash;
    deposit.confirmations = match.confirmations;
    if (match.confirmations >= deposit.requiredConfirmations) {
      await creditCryptoDeposit(deposit);
      await deposit.reload();
    } else {
      deposit.status = 'confirming';
      await deposit.save();
    }
  }

  return deposit;
}
