// ★ DUMMY API HELPER — Every network file uses this to simulate real API latency ★
// When backend (NestJS) is ready, replace these with real fetch/axios calls.

import axios from 'axios';

export const simulateDelay = (ms: number = 800): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const simulateApiCall = async <T>(data: T, delayMs: number = 800): Promise<T> => {
  await simulateDelay(delayMs);
  return data;
};

export const simulateApiError = async (message: string, delayMs: number = 500): Promise<never> => {
  await simulateDelay(delayMs);
  throw new Error(message);
};

// ★ BACKEND BASE URL ★
export const API_BASE_URL = 'https://finmatrix-api-a824f23fbd72.herokuapp.com/api/v1';

// Setup basic axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Optional: you can add interceptors here to inject tokens later
// api.interceptors.request.use(config => {
//   // config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });
