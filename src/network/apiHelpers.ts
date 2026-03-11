// ★ DUMMY API HELPER — Every network file uses this to simulate real API latency ★
// When backend (NestJS) is ready, replace these with real fetch/axios calls.

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

// ★ BACKEND BASE URL — change this when NestJS server is running ★
// For now all network files use dummy data. When ready, swap to:
// export const API_BASE_URL = 'http://10.0.2.2:3000/api'; // Android emulator -> localhost
// export const API_BASE_URL = 'http://192.168.X.X:3000/api'; // Physical device -> your IP
export const API_BASE_URL = '__DUMMY_MODE__'; // Signals we're using mock data
