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

export default function DepositPage() {
  const { user, fetchUser } = useAuthStore();
  const [channels, setChannels] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [amount, setAmount] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    api.get('/payments/channels').then(({ data }) => {
      setChannels(data);
      if (data.length) setSelectedChannel(data[0].channel);
    });
    api.get('/payments/my-deposits').then(({ data }) => setDeposits(data));
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

        {/* Channel selection */}
        {channels.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm text-on-surface-variant">Способ оплаты</label>
            <div className="grid grid-cols-2 gap-2">
              {channels.map(ch => (
                <button
                  key={ch.channel}
                  onClick={() => setSelectedChannel(ch.channel)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedChannel === ch.channel
                      ? 'border-primary-action bg-primary-action/10'
                      : 'border-outline-variant/30 hover:border-primary/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-primary">
                    {channelIcons[ch.channel] || 'payment'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {channelLabels[ch.channel] || ch.channel}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {ch.minAmount}–{ch.maxAmount} ₽
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {channels.length === 0 && (
          <p className="text-center text-on-surface-variant py-4">
            Нет доступных способов оплаты. Обратитесь в поддержку.
          </p>
        )}

        {/* Pay button */}
        <button
          onClick={handleDeposit}
          disabled={loading || !amount || !selectedChannel}
          className="btn-primary w-full py-4 justify-center text-base disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              Создание платежа...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">payment</span>
              Пополнить {amount ? `${amount} ₽` : ''}
            </>
          )}
        </button>
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
    </div>
  );
}
