import { CryptoDeposit, User, BalanceTransaction, Setting } from '../models/index.js';
import sequelize from '../config/database.js';
import { notifyUser } from '../bot/index.js';

// --- Rate fetching ---

async function fetchHtxUsdtRub() {
  const url = 'https://www.htx.com/-/x/otc/v1/data/trade-market?coinId=2&currency=11&tradeType=sell&currPage=1&payMethod=29,28&acceptOrder=0&blockType=general&online=1&range=0&amount=70000&isThumbsUp=false&isMerchant=false&isTraded=false&onlyTradable=false&isFollowed=false';
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0', 'client-type': 'web' },
  });
  const data = await res.json();
  const offers = data.data || [];
  const prices = offers.slice(0, 10).map(o => parseFloat(o.price)).filter(p => p > 0);
  if (!prices.length) throw new Error('HTX P2P: no offers');
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

export async function getCryptoRates() {
  try {
    const [htxRes, usdtRub] = await Promise.all([
      fetch('https://api.huobi.pro/market/tickers'),
      fetchHtxUsdtRub(),
    ]);
    const htxData = await htxRes.json();

    let btcUsdt = 0, ltcUsdt = 0;
    for (const t of htxData.data) {
      if (t.symbol === 'btcusdt') btcUsdt = t.close;
      else if (t.symbol === 'ltcusdt') ltcUsdt = t.close;
    }

    return {
      btc: btcUsdt * usdtRub,
      ltc: ltcUsdt * usdtRub,
      usdt: usdtRub,
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

  // Calculate unique crypto amount for exact tx matching on shared wallet
  const baseAmount = amountRub / rate;
  const decimals = currency === 'usdt' ? 2 : 8;

  const activeAmounts = new Set(
    (await CryptoDeposit.findAll({
      where: { currency, status: ['pending', 'confirming'] },
      attributes: ['amountCrypto'],
    })).map(d => d.amountCrypto.toString())
  );

  let amountCrypto;
  for (let attempt = 0; attempt < 50; attempt++) {
    const offset = (Math.floor(Math.random() * 9000) + 1000) / Math.pow(10, decimals);
    const candidate = parseFloat((baseAmount + offset).toFixed(decimals));
    if (!activeAmounts.has(candidate.toString())) { amountCrypto = candidate; break; }
  }
  if (!amountCrypto) throw Object.assign(new Error('Не удалось сформировать уникальную сумму. Попробуйте позже.'), { status: 409 });

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
  return txs.find(tx => tx.amount === target);
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

  // Collect txHashes already used by paid deposits to prevent double-crediting
  const usedHashes = new Set(
    (await CryptoDeposit.findAll({ where: { status: 'paid' }, attributes: ['txHash'] }))
      .map(d => d.txHash).filter(Boolean)
  );

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

      if (!match || usedHashes.has(match.txHash)) continue;

      deposit.txHash = match.txHash;
      deposit.confirmations = match.confirmations;

      if (match.confirmations >= deposit.requiredConfirmations) {
        await creditCryptoDeposit(deposit);
        usedHashes.add(match.txHash);
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

    // Prevent same tx from being credited to multiple deposits
    if (fresh.txHash) {
      const existing = await CryptoDeposit.findOne({
        where: { txHash: fresh.txHash, status: 'paid' },
        transaction: t,
      });
      if (existing) { await t.rollback(); return; }
    }

    fresh.status = 'paid';
    await fresh.save({ transaction: t });

    const user = await User.findByPk(fresh.userId, { lock: true, transaction: t });
    await user.increment('balance', { by: parseFloat(fresh.amountRub), transaction: t });

    await BalanceTransaction.create({
      userId: fresh.userId,
      amount: parseFloat(fresh.amountRub),
      type: 'deposit',
      description: `Крипто-пополнение ${fresh.currency.toUpperCase()} (${fresh.amountCrypto})`,
    }, { transaction: t });

    await t.commit();

    await user.reload();
    notifyUser(fresh.userId, `✅ Крипто-депозит подтверждён!\n${fresh.amountCrypto} ${fresh.currency.toUpperCase()} → ${fresh.amountRub} ₽\nБаланс: ${parseFloat(user.balance).toFixed(2)} ₽`);
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

// --- Fetch single tx by hash from blockchain ---

async function fetchTxByHash(currency, txHash, walletAddress) {
  if (currency === 'btc') {
    const [txRes, tipHeight] = await Promise.all([
      fetch(`https://blockstream.info/api/tx/${txHash}`),
      getBtcTipHeight(),
    ]);
    if (!txRes.ok) return null;
    const tx = await txRes.json();
    const output = tx.vout.find(v => v.scriptpubkey_address === walletAddress);
    const confs = tx.status?.confirmed && tx.status.block_height && tipHeight
      ? tipHeight - tx.status.block_height + 1 : 0;
    return {
      amount: output ? output.value / 1e8 : 0,
      confirmations: confs,
      timestamp: tx.status?.block_time ? new Date(tx.status.block_time * 1000) : null,
    };
  }

  if (currency === 'ltc') {
    const res = await fetch(`https://api.blockcypher.com/v1/ltc/main/txs/${txHash}`);
    if (!res.ok) return null;
    const tx = await res.json();
    const output = tx.outputs?.find(o => o.addresses?.includes(walletAddress));
    return {
      amount: output ? output.value / 1e8 : 0,
      confirmations: tx.confirmations || 0,
      timestamp: tx.confirmed ? new Date(tx.confirmed) : null,
    };
  }

  if (currency === 'usdt') {
    const res = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`);
    if (!res.ok) return null;
    const tx = await res.json();
    const isToWallet = tx.toAddress === walletAddress || tx.transfersAllList?.some(t => t.toAddress === walletAddress);
    const transfer = tx.transfersAllList?.find(t => t.toAddress === walletAddress);
    return {
      amount: transfer ? parseInt(transfer.amount_str || '0') / 1e6 : 0,
      confirmations: tx.confirmed ? 20 : 0,
      timestamp: tx.timestamp ? new Date(tx.timestamp) : null,
    };
  }

  return null;
}

// --- Admin: resolve deposit by tx hash ---

export async function adminResolveCryptoDeposit(depositId, txHash) {
  const deposit = await CryptoDeposit.findByPk(depositId);
  if (!deposit) throw Object.assign(new Error('Депозит не найден'), { status: 404 });
  if (deposit.status === 'paid') throw Object.assign(new Error('Депозит уже зачислен'), { status: 400 });

  // Check tx hash not already used
  const existing = await CryptoDeposit.findOne({ where: { txHash, status: 'paid' } });
  if (existing) throw Object.assign(new Error('Этот txHash уже использован в другом депозите'), { status: 400 });

  // Fetch tx from blockchain
  const txInfo = await fetchTxByHash(deposit.currency, txHash, deposit.walletAddress);
  if (!txInfo) throw Object.assign(new Error('Транзакция не найдена в блокчейне'), { status: 400 });
  if (!txInfo.amount) throw Object.assign(new Error('В транзакции нет перевода на указанный кошелёк'), { status: 400 });

  // Verify timing: tx should be within reasonable window of deposit creation (±2 hours)
  if (txInfo.timestamp) {
    const depositTime = new Date(deposit.createdAt).getTime();
    const txTime = txInfo.timestamp.getTime();
    const diffHours = Math.abs(txTime - depositTime) / (1000 * 60 * 60);
    if (diffHours > 1) throw Object.assign(new Error(`Время транзакции не совпадает (разница ${diffHours.toFixed(1)}ч)`), { status: 400 });
  }

  // Calculate actual RUB amount based on current rate
  const rates = await getCryptoRates();
  const rate = rates[deposit.currency];
  if (!rate) throw Object.assign(new Error('Не удалось получить курс'), { status: 500 });

  const actualAmountRub = Math.round(txInfo.amount * rate);

  // Update deposit with tx data and credit
  deposit.txHash = txHash;
  deposit.amountCrypto = txInfo.amount;
  deposit.amountRub = actualAmountRub;
  deposit.confirmations = txInfo.confirmations;
  await deposit.save();

  await creditCryptoDeposit(deposit);
  await deposit.reload();

  return deposit;
}
