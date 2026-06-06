import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BotConfig = sequelize.define('BotConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  types: {
    type: DataTypes.ARRAY(DataTypes.STRING(50)),
    defaultValue: ['shop'],
    allowNull: false,
  },
  ownerTelegramId: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  welcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'stopped',
  },
  lastError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'bot_configs',
  timestamps: true,
});

export default BotConfig;
