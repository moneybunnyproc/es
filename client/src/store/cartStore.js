import { create } from 'zustand';
import api from '../api/axios';

const useCartStore = create((set) => ({
  orders: [],
  currentOrder: null,
  loading: false,

  createOrder: async (productId, quantity, promoCode, paymentMethod) => {
    const { data } = await api.post('/orders', { productId, quantity, promoCode, paymentMethod });
    return data;
  },

  fetchOrders: async () => {
    set({ loading: true });
    const { data } = await api.get('/orders');
    set({ orders: data, loading: false });
  },

  fetchOrder: async (id) => {
    const { data } = await api.get(`/orders/${id}`);
    set({ currentOrder: data });
    return data;
  },

  checkPromo: async (code) => {
    const { data } = await api.post('/orders/check-promo', { code });
    return data;
  },
}));

export default useCartStore;
