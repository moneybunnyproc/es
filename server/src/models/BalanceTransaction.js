import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BalanceTransaction = sequelize.define('BalanceTransaction', {
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
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('deposit', 'purchase', 'refund', 'admin'),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'balance_transactions',
  timestamps: true,
});

export default BalanceTransaction;
