import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('safarx_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = error.response?.data?.message;
    if (!message && error.response?.data?.errors?.length) {
      message = error.response.data.errors.map((e) => e.msg).join(' ');
    }
    message = message || error.message || 'Something went wrong';

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('safarx_token');
      localStorage.removeItem('safarx_user');
      window.location.href = '/';
    }

    return Promise.reject({ message, status: error.response?.status });
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
};

// Sender APIs
export const senderAPI = {
  createDelivery: (data) => api.post('/sender/delivery', data),
  getDeliveries: (params) => api.get('/sender/deliveries', { params }),
  getDeliveryById: (id) => api.get(`/sender/delivery/${id}`),
  updateDelivery: (id, data) => api.put(`/sender/delivery/${id}`, data),
  cancelDelivery: (id, reason) => api.delete(`/sender/delivery/${id}`, { data: { reason } }),
  rateTraveler: (id, data) => api.post(`/sender/delivery/${id}/rate`, data),
  getStats: () => api.get('/sender/stats'),
};

// Traveler APIs
export const travelerAPI = {
  getAvailableDeliveries: (params) => api.get('/traveler/available-deliveries', { params }),
  getMyDeliveries: (params) => api.get('/traveler/my-deliveries', { params }),
  acceptDelivery: (id) => api.post(`/traveler/delivery/${id}/accept`),
  getDeliveryDetails: (id) => api.get(`/traveler/delivery/${id}`),
  updateStatus: (id, data) => api.put(`/traveler/delivery/${id}/status`, data),
  cancelDelivery: (id, reason) => api.post(`/traveler/delivery/${id}/cancel`, { reason }),
  createRoute: (data) => api.post('/traveler/route', data),
  getStats: () => api.get('/traveler/stats'),
};

// Contact APIs
export const contactAPI = {
  submitContactForm: (data) => api.post('/contact', data),
  getAllContacts: (params) => api.get('/contact/all', { params }),
  getContactById: (id) => api.get(`/contact/${id}`),
  updateStatus: (id, data) => api.put(`/contact/${id}/status`, data),
  respondToContact: (id, response) => api.post(`/contact/${id}/respond`, { response }),
  deleteContact: (id) => api.delete(`/contact/${id}`),
  getStats: () => api.get('/contact/stats'),
};

// Chat APIs
export const chatAPI = {
  sendMessage: (messages) => api.post('/chat', { messages }),
};

export default api;
