import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PaymentCallback = sequelize.define('PaymentCallback', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  paymentSystemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payment_systems', key: 'id' },
  },
  externalOrderId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  reference: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'RUB',
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  channel: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  rawPayload: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'payment_callbacks',
  timestamps: true,
});

export default PaymentCallback;
