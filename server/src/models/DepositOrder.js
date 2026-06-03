import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const DepositOrder = sequelize.define('DepositOrder', {
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
  paymentSystemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'payment_systems', key: 'id' },
  },
  reference: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  externalOrderId: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  channel: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled', 'expired'),
    defaultValue: 'pending',
  },
  paymentUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  paymentData: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'deposit_orders',
  timestamps: true,
});

export default DepositOrder;
