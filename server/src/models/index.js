import sequelize from '../config/database.js';
import User from './User.js';
import Shop from './Shop.js';
import Category from './Category.js';
import Product from './Product.js';
import ProductImage from './ProductImage.js';
import ProductItem from './ProductItem.js';
import Order from './Order.js';
import Review from './Review.js';
import PromoCode from './PromoCode.js';
import ChatMessage from './ChatMessage.js';
import BalanceTransaction from './BalanceTransaction.js';
import Setting from './Setting.js';
import PaymentSystem from './PaymentSystem.js';
import PaymentCallback from './PaymentCallback.js';
import DepositOrder from './DepositOrder.js';
import BotConfig from './BotConfig.js';

// Shop -> Category -> Product
Shop.hasMany(Category, { foreignKey: 'shopId', as: 'categories' });
Category.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Product -> Images
Product.hasMany(ProductImage, { foreignKey: 'productId', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'productId' });

// Product -> Items (digital goods stock)
Product.hasMany(ProductItem, { foreignKey: 'productId', as: 'items' });
ProductItem.belongsTo(Product, { foreignKey: 'productId' });

// User -> Orders
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(Order, { foreignKey: 'productId', as: 'orders' });

// User -> Reviews
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });

// User -> Chat Messages
User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'messages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User -> Balance Transactions
User.hasMany(BalanceTransaction, { foreignKey: 'userId', as: 'transactions' });
BalanceTransaction.belongsTo(User, { foreignKey: 'userId' });

// PromoCode -> Orders
Order.belongsTo(PromoCode, { foreignKey: 'promoCodeId', as: 'promoCode' });

// Payment System -> Callbacks
PaymentSystem.hasMany(PaymentCallback, { foreignKey: 'paymentSystemId', as: 'callbacks' });
PaymentCallback.belongsTo(PaymentSystem, { foreignKey: 'paymentSystemId', as: 'paymentSystem' });

// User -> Deposit Orders
User.hasMany(DepositOrder, { foreignKey: 'userId', as: 'deposits' });
DepositOrder.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DepositOrder.belongsTo(PaymentSystem, { foreignKey: 'paymentSystemId', as: 'paymentSystem' });

export {
  sequelize,
  User,
  Shop,
  Category,
  Product,
  ProductImage,
  ProductItem,
  Order,
  Review,
  PromoCode,
  ChatMessage,
  BalanceTransaction,
  Setting,
  PaymentSystem,
  PaymentCallback,
  DepositOrder,
  BotConfig,
};
