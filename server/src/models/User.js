import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('client', 'operator', 'admin'),
    defaultValue: 'client',
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  personalDiscount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isShadowBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  telegramId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    unique: true,
  },
  telegramUsername: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  twoFactorSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  adminNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  walletBtc: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  walletUsdt: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

User.prototype.checkPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.password;
  delete values.twoFactorSecret;
  return values;
};

export default User;
