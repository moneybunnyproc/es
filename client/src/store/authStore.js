import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  fetchUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    if (data.user) {
      set({ user: data.user });
    }
    return data;
  },

  register: async (username, password, captchaId, captchaText) => {
    const { data } = await api.post('/auth/register', { username, password, captchaId, captchaText });
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    set({ user: data.user });
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    set({ user: null });
  },
}));

export default useAuthStore;
