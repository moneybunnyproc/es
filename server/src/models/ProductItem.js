import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ProductItem = sequelize.define('ProductItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'products', key: 'id' },
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  isSold: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'product_items',
  timestamps: true,
});

export default ProductItem;
