// src/api/api.js - API Client
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Bank API
export const bankAPI = {
  getAll: () => api.get('/banks'),
  getById: (id) => api.get(`/banks/${id}`),
  create: (data) => api.post('/banks', data),
  initDemo: () => api.post('/banks/init-demo'),
  updateStatistics: (id, data) => api.patch(`/banks/${id}/statistics`, data),
  delete: (id) => api.delete(`/banks/${id}`)
};

// Training API
export const trainingAPI = {
  start: () => api.post('/training/start'),
  submitUpdate: (data) => api.post('/training/submit-update', data),
  aggregate: (roundId) => api.post(`/training/aggregate/${roundId}`),
  getHistory: (limit = 10) => api.get(`/training/history?limit=${limit}`),
  getRound: (roundId) => api.get(`/training/${roundId}`),
  getStatus: () => api.get('/training/status/current')
};

// Model API
export const modelAPI = {
  getCurrent: () => api.get('/models/current'),
  getVersions: (limit = 10) => api.get(`/models/versions?limit=${limit}`),
  getVersion: (version) => api.get(`/models/version/${version}`),
  evaluate: (data) => api.post('/models/evaluate', data),
  predict: (data) => api.post('/models/predict', data),
  compare: (data) => api.post('/models/compare', data)
};

export default api;