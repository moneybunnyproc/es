import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PaymentSystem = sequelize.define('PaymentSystem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  baseUrl: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  apiKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  apiSign: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  channels: {
    type: DataTypes.JSON,
    defaultValue: ['card', 'sbp'],
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  minAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 100,
  },
  maxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 100000,
  },
}, {
  tableName: 'payment_systems',
  timestamps: true,
});

export default PaymentSystem;
