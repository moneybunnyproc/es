import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { depositStatusMap } from '../../components/common/index.jsx';

const channelLabels = {
  card: 'Банковская карта',
  sbp: 'СБП',
  qr: 'QR-код',
  sim: 'SIM / телефон',
  cash: 'Наличные',
  transgran: 'Трансграничный',
  alfa2alfa: 'Альфа-Банк',
  tbank2tbank: 'Т-Банк',
  sber2sber: 'Сбербанк',
  vtb2vtb: 'ВТБ',
};

const channelIcons = {
  card: 'credit_card',
  sbp: 'account_balance',
  qr: 'qr_code_2',
  sim: 'sim_card',
  cash: 'payments',
};

const cryptoIcons = { btc: 'currency_bitcoin', ltc: 'token', usdt: 'attach_money' };

export default function DepositPage() {
  const { user, fetchUser } = useAuthStore();
  const [channels, setChannels] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [amount, setAmount] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentMode, setPaymentMode] = useState('fiat'); // 'fiat' | 'crypto'
  const [cryptoChannels, setCryptoChannels] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [cryptoResult, setCryptoResult] = useState(null);
  const [cryptoDeposits, setCryptoDeposits] = useState([]);

  useEffect(() => {
    api.get('/payments/channels').then(({ data }) => {
      setChannels(data);
      if (data.length) setSelectedChannel(data[0].channel);
    });
    api.get('/payments/my-deposits').then(({ data }) => setDeposits(data));
    api.get('/payments/crypto/channels').then(({ data }) => {
      setCryptoChannels(data);
      if (data.length) setSelectedCrypto(data[0].currency);
    }).catch(() => {});
    api.get('/payments/crypto/my-deposits').then(({ data }) => setCryptoDeposits(data)).catch(() => {});
  }, []);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Укажите сумму');
    setLoading(true);
    try {
      const { data } = await api.post('/payments/deposit', {
        amount: parseFloat(amount),
        channel: selectedChannel,
      });
      setPaymentResult(data);
      toast.success('Платёж создан');
      // Refresh deposits
      api.get('/payments/my-deposits').then(({ data }) => setDeposits(data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка создания платежа');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Укажите сумму');
    setLoading(true);
    try {
      const { data } = await api.post('/payments/crypto/deposit', {
        currency: selectedCrypto,
        amountRub: parseFloat(amount),
      });
      setCryptoResult(data);
      toast.success('Крипто-платёж создан');
      api.get('/payments/crypto/my-deposits').then(({ data }) => setCryptoDeposits(data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 2000, 5000];


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-on-surface">Пополнение баланса</h1>

      <div className="glass-card-static rounded-2xl p-6 space-y-5">
        {/* Current balance */}
        <div className="flex items-center justify-between p-4 bg-surface/50 rounded-xl border border-outline-variant/10">
          <span className="text-on-surface-variant">Текущий баланс</span>
          <span className="text-2xl font-bold text-secondary">{parseFloat(user?.balance || 0).toFixed(2)} ₽</span>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-sm text-on-surface-variant">Сумма пополнения</label>
          <input
            type="number"
            className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface text-lg font-bold focus:outline-none focus:border-primary-action transition-colors"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="1"
          />
          <div className="flex gap-2 flex-wrap">
            {quickAmounts.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  amount === String(a)
                    ? 'bg-primary-action text-white'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {a} ₽
              </button>
            ))}
          </div>
        </div>

        {/* Payment mode toggle */}
        {cryptoChannels.length > 0 && (
          <div className="flex gap-0 border-b border-outline-variant/20">
            <button onClick={() => setPaymentMode('fiat')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${paymentMode === 'fiat' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}>
              Банк / СБП
            </button>
            <button onClick={() => setPaymentMode('crypto')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${paymentMode === 'crypto' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'}`}>
              Криптовалюта
            </button>
          </div>
        )}

        {/* Fiat channels */}
        {paymentMode === 'fiat' && (
          <>
            {channels.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-on-surface-variant">Способ оплаты</label>
                <div className="grid grid-cols-2 gap-2">
                  {channels.map(ch => (
                    <button key={ch.channel} onClick={() => setSelectedChannel(ch.channel)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedChannel === ch.channel ? 'border-primary-action bg-primary-action/10' : 'border-outline-variant/30 hover:border-primary/30'
                      }`}>
                      <span className="material-symbols-outlined text-xl text-primary">{channelIcons[ch.channel] || 'payment'}</span>
                      <div>
                        <p className="text-sm font-medium text-on-surface">{channelLabels[ch.channel] || ch.channel}</p>
                        <p className="text-xs text-on-surface-variant">{ch.minAmount}–{ch.maxAmount} ₽</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {channels.length === 0 && <p className="text-center text-on-surface-variant py-4">Нет доступных способов оплаты.</p>}
            <button onClick={handleDeposit} disabled={loading || !amount || !selectedChannel}
              className="btn-primary w-full py-4 justify-center text-base disabled:opacity-50">
              {loading ? (<><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Создание платежа...</>)
                : (<><span className="material-symbols-outlined text-[18px]">payment</span> Пополнить {amount ? `${amount} ₽` : ''}</>)}
            </button>
          </>
        )}

        {/* Crypto channels */}
        {paymentMode === 'crypto' && (
          <>
            <div className="space-y-2">
              <label className="text-sm text-on-surface-variant">Выберите криптовалюту</label>
              <div className="grid grid-cols-3 gap-2">
                {cryptoChannels.map(ch => (
                  <button key={ch.currency} onClick={() => setSelectedCrypto(ch.currency)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      selectedCrypto === ch.currency ? 'border-primary-action bg-primary-action/10' : 'border-outline-variant/30 hover:border-primary/30'
                    }`}>
                    <span className="material-symbols-outlined text-2xl text-primary">{cryptoIcons[ch.currency] || 'token'}</span>
                    <p className="text-sm font-medium text-on-surface">{ch.label}</p>
                    <p className="text-xs text-on-surface-variant">1 = {ch.rate?.toLocaleString('ru')} ₽</p>
                  </button>
                ))}
              </div>
            </div>
            {amount && selectedCrypto && cryptoChannels.find(c => c.currency === selectedCrypto) && (
              <div className="bg-surface/50 border border-outline-variant/10 rounded-xl p-3 text-center">
                <span className="text-sm text-on-surface-variant">≈ </span>
                <span className="text-lg font-bold text-on-surface">
                  {(parseFloat(amount) / cryptoChannels.find(c => c.currency === selectedCrypto).rate).toFixed(selectedCrypto === 'usdt' ? 2 : 8)}
                </span>
                <span className="text-sm text-on-surface-variant ml-1">{selectedCrypto.toUpperCase()}</span>
              </div>
            )}
            <button onClick={handleCryptoDeposit} disabled={loading || !amount || !selectedCrypto}
              className="btn-primary w-full py-4 justify-center text-base disabled:opacity-50">
              {loading ? (<><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Создание...</>)
                : (<><span className="material-symbols-outlined text-[18px]">currency_bitcoin</span> Оплатить криптой {amount ? `${amount} ₽` : ''}</>)}
            </button>
          </>
        )}
      </div>

      {/* Payment result */}
      {paymentResult && (
        <div className="glass-card-static rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">check_circle</span>
            Платёж создан — переведите средства
          </h3>

          {/* Requisite details */}
          {paymentResult.requisite && (
            <div className="bg-surface/50 border border-outline-variant/10 rounded-xl p-4 space-y-2">
              {paymentResult.requisite.bank && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant text-sm">Банк</span>
                  <span className="text-on-surface font-medium text-sm">{paymentResult.requisite.bank}</span>
                </div>
              )}
              {paymentResult.requisite.number && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant text-sm">Номер / реквизит</span>
                  <span className="text-on-surface font-bold text-base font-mono tracking-wider">{paymentResult.requisite.number}</span>
                </div>
              )}
              {paymentResult.requisite.holder && (
                <div className="flex justify-between">
                  <span className="text-on-surface-variant text-sm">Получатель</span>
                  <span className="text-on-surface font-medium text-sm">{paymentResult.requisite.holder}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-on-surface-variant text-sm">Сумма</span>
                <span className="text-primary-action font-bold text-lg">{paymentResult.deposit?.amount} ₽</span>
              </div>
              {paymentResult.requisite.notes && (
                <p className="text-xs text-tertiary mt-1">{paymentResult.requisite.notes}</p>
              )}
            </div>
          )}

          {paymentResult.paymentUrl && (
            <a
              href={paymentResult.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full py-3 justify-center"
            >
              Перейти к оплате
            </a>
          )}

          <button
            onClick={async () => {
              if (!paymentResult.deposit?.id) return;
              setChecking(true);
              try {
                const { data } = await api.post(`/payments/check/${paymentResult.deposit.id}`);
                if (data.status === 'paid') {
                  toast.success('Оплата подтверждена! Баланс пополнен.');
                  setPaymentResult(null);
                  fetchUser();
                  api.get('/payments/my-deposits').then(({ data }) => setDeposits(data));
                } else {
                  toast.info('Оплата ещё не подтверждена. Попробуйте позже.');
                }
              } catch {
                toast.error('Ошибка проверки');
              } finally {
                setChecking(false);
              }
            }}
            disabled={checking}
            className="btn-ghost w-full py-3 justify-center disabled:opacity-50"
          >
            {checking ? (
              <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Проверяем...</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">refresh</span> Я оплатил — проверить</>
            )}
          </button>

          <p className="text-xs text-on-surface-variant text-center">
            После оплаты нажмите кнопку выше или баланс пополнится автоматически
          </p>
        </div>
      )}

      {/* Crypto payment result */}
      {cryptoResult && (
        <div className="glass-card-static rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">currency_bitcoin</span>
            Переведите точную сумму
          </h3>
          <div className="bg-surface/50 border border-outline-variant/10 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Валюта</span>
              <span className="text-on-surface font-bold">{cryptoResult.deposit.currency.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Сумма</span>
              <span className="text-primary-action font-bold text-lg font-mono">{cryptoResult.deposit.amountCrypto}</span>
            </div>
            <div>
              <span className="text-on-surface-variant text-sm block mb-1">Кошелёк</span>
              <div className="bg-surface-container rounded-lg px-3 py-2 font-mono text-sm text-on-surface break-all select-all">
                {cryptoResult.deposit.walletAddress}
              </div>
            </div>
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Курс: 1 {cryptoResult.deposit.currency.toUpperCase()} = {cryptoResult.rate?.toLocaleString('ru')} ₽</span>
              <span>Истекает через 1 час</span>
            </div>
          </div>
          <p className="text-xs text-tertiary text-center">Переведите точную сумму — она уникальна для идентификации вашего платежа</p>
          <button
            onClick={async () => {
              setChecking(true);
              try {
                const { data } = await api.post(`/payments/crypto/check/${cryptoResult.deposit.id}`);
                if (data.status === 'paid') {
                  toast.success('Оплата подтверждена!');
                  setCryptoResult(null);
                  fetchUser();
                  api.get('/payments/crypto/my-deposits').then(({ data }) => setCryptoDeposits(data));
                } else if (data.status === 'confirming') {
                  toast.info(`Ожидание подтверждений: ${data.confirmations}/${data.requiredConfirmations}`);
                } else {
                  toast.info('Транзакция ещё не найдена. Попробуйте позже.');
                }
              } catch { toast.error('Ошибка проверки'); }
              finally { setChecking(false); }
            }}
            disabled={checking}
            className="btn-ghost w-full py-3 justify-center disabled:opacity-50"
          >
            {checking ? (<><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Проверяем...</>)
              : (<><span className="material-symbols-outlined text-[16px]">refresh</span> Я оплатил — проверить</>)}
          </button>
        </div>
      )}

      {/* History */}
      {deposits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-on-surface">История пополнений</h2>
          <div className="space-y-2">
            {deposits.map(d => (
              <div key={d.id} className="glass-card-static rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-on-surface font-medium">{d.amount} ₽</p>
                  <p className="text-xs text-on-surface-variant">
                    {channelLabels[d.channel] || d.channel} • {d.paymentSystem?.name}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`badge ${depositStatusMap[d.status]?.badge ?? 'badge-primary'}`}>{depositStatusMap[d.status]?.label ?? d.status}</span>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {new Date(d.createdAt).toLocaleString('ru')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Crypto history */}
      {cryptoDeposits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-on-surface">Крипто-пополнения</h2>
          <div className="space-y-2">
            {cryptoDeposits.map(d => (
              <div key={d.id} className="glass-card-static rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-on-surface font-medium">{d.amountRub} ₽</p>
                  <p className="text-xs text-on-surface-variant">
                    {d.amountCrypto} {d.currency.toUpperCase()}
                    {d.txHash && <span className="ml-1 font-mono">tx: {d.txHash.slice(0, 10)}...</span>}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`badge ${depositStatusMap[d.status]?.badge ?? 'badge-primary'}`}>
                    {d.status === 'confirming' ? `${d.confirmations}/${d.requiredConfirmations}` : (depositStatusMap[d.status]?.label ?? d.status)}
                  </span>
                  <p className="text-xs text-on-surface-variant mt-1">{new Date(d.createdAt).toLocaleString('ru')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
