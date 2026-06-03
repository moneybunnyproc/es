import { create } from 'zustand';
import api from '../api/axios';

const useShopStore = create((set) => ({
  shops: [],
  categories: [],
  products: [],
  currentProduct: null,
  searchResults: [],
  loading: false,

  fetchShops: async () => {
    set({ loading: true });
    const { data } = await api.get('/shops');
    set({ shops: data, loading: false });
  },

  fetchCategories: async (shopId) => {
    set({ loading: true });
    const { data } = await api.get(`/shops/${shopId}/categories`);
    set({ categories: data, loading: false });
  },

  fetchProducts: async (categoryId) => {
    set({ loading: true });
    const { data } = await api.get(`/categories/${categoryId}/products`);
    set({ products: data, loading: false });
  },

  fetchProduct: async (id) => {
    set({ loading: true });
    const { data } = await api.get(`/products/${id}`);
    set({ currentProduct: data, loading: false });
  },

  searchProducts: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    const { data } = await api.get(`/products/search?q=${encodeURIComponent(query)}`);
    set({ searchResults: data });
  },
}));

export default useShopStore;
