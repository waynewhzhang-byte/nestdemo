import axios from 'axios';
import type { User, AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/auth/login', data).then(res => res.data),
  
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/auth/register', data).then(res => res.data),
  
  getProfile: () =>
    api.get<User>('/auth/profile').then(res => res.data),
  
  updateProfile: (data: Partial<User>) =>
    api.put<User>('/auth/profile', data).then(res => res.data),
};

export const booksApi = {
  getAll: (params?: { search?: string; category?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/books', { params }).then(res => res.data),
  
  getById: (id: string) =>
    api.get(`/books/${id}`).then(res => res.data),
  
  create: (data: object) =>
    api.post('/books', data).then(res => res.data),
  
  update: (id: string, data: object) =>
    api.put(`/books/${id}`, data).then(res => res.data),
  
  delete: (id: string) =>
    api.delete(`/books/${id}`).then(res => res.data),
  
  getCategories: () =>
    api.get('/books/categories').then(res => res.data),
  
  getStatistics: () =>
    api.get('/books/statistics').then(res => res.data),
};

export const borrowingsApi = {
  borrow: (bookId: string) =>
    api.post('/borrowings/borrow', { bookId }).then(res => res.data),
  
  return: (borrowingId: string) =>
    api.post('/borrowings/return', { borrowingId }).then(res => res.data),
  
  renew: (borrowingId: string) =>
    api.post('/borrowings/renew', { borrowingId }).then(res => res.data),
  
  getMy: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/borrowings/my', { params }).then(res => res.data),
  
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/borrowings', { params }).then(res => res.data),
  
  getOverdue: () =>
    api.get('/borrowings/overdue').then(res => res.data),
};

export const reservationsApi = {
  create: (bookId: string) =>
    api.post('/reservations', { bookId }).then(res => res.data),
  
  getMy: () =>
    api.get('/reservations/my').then(res => res.data),
  
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/reservations', { params }).then(res => res.data),
  
  cancel: (id: string) =>
    api.post(`/reservations/${id}/cancel`).then(res => res.data),
  
  markReady: (id: string) =>
    api.post(`/reservations/${id}/ready`).then(res => res.data),
  
  fulfill: (id: string) =>
    api.post(`/reservations/${id}/fulfill`).then(res => res.data),
};

export const finesApi = {
  getMy: () =>
    api.get('/fines/my').then(res => res.data),
  
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/fines', { params }).then(res => res.data),
  
  getStatistics: () =>
    api.get('/fines/statistics').then(res => res.data),
  
  pay: (id: string, amount: number) =>
    api.post(`/fines/${id}/pay`, { amount }).then(res => res.data),
  
  waive: (id: string) =>
    api.post(`/fines/${id}/waive`).then(res => res.data),
};

export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; role?: string; isActive?: boolean }) =>
    api.get('/users', { params }).then(res => res.data),
  getById: (id: string) =>
    api.get(`/users/${id}`).then(res => res.data),
  create: (data: { email: string; password: string; name: string; role: string; studentId?: string; teacherId?: string; phone?: string }) =>
    api.post('/users', data).then(res => res.data),
  update: (id: string, data: { name?: string; phone?: string; role?: string; isActive?: boolean }) =>
    api.put(`/users/${id}`, data).then(res => res.data),
  remove: (id: string) =>
    api.delete(`/users/${id}`).then(res => res.data),
};

export const statisticsApi = {
  getDashboard: (params?: { timeRange?: string; startDate?: string; endDate?: string }) =>
    api.get('/statistics/dashboard', { params }).then(res => res.data),
  getBorrowings: (params?: { timeRange?: string; startDate?: string; endDate?: string }) =>
    api.get('/statistics/borrowings', { params }).then(res => res.data),
  getBooks: () =>
    api.get('/statistics/books').then(res => res.data),
  getUsers: (params?: { timeRange?: string; startDate?: string; endDate?: string }) =>
    api.get('/statistics/users', { params }).then(res => res.data),
  getFines: (params?: { timeRange?: string; startDate?: string; endDate?: string }) =>
    api.get('/statistics/fines', { params }).then(res => res.data),
  getTrends: () =>
    api.get('/statistics/trends').then(res => res.data),
};

export const get = <T>(url: string, params?: object) =>
  api.get<T>(url, { params }).then((res) => res.data);

export const post = <T>(url: string, data?: object) =>
  api.post<T>(url, data).then((res) => res.data);

export const put = <T>(url: string, data?: object) =>
  api.put<T>(url, data).then((res) => res.data);

export const del = <T>(url: string) =>
  api.delete<T>(url).then((res) => res.data);

export default api;
