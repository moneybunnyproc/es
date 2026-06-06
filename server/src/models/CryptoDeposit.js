import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CryptoDeposit = sequelize.define('CryptoDeposit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  currency: {
    type: DataTypes.ENUM('btc', 'ltc', 'usdt'),
    allowNull: false,
  },
  amountCrypto: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: false,
  },
  amountRub: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  walletAddress: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  txHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  confirmations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  requiredConfirmations: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirming', 'paid', 'expired'),
    defaultValue: 'pending',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'crypto_deposits',
  timestamps: true,
});

export default CryptoDeposit;
