import axios from 'axios';
import { setTimeout as sleep } from 'timers/promises';

/**
 * Configuration for test utilities
 */
export interface TestConfig {
  httpPort?: number;
  wsPort?: number;
  baseUrl?: string;
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<TestConfig> = {
  httpPort: 3000,
  wsPort: 3001,
  baseUrl: 'http://localhost:3000',
  maxRetries: 5,
  baseRetryDelay: 300,
  maxRetryDelay: 3000,
};

/**
 * Checks if the server is ready by querying its readiness endpoint
 * @param config Test configuration
 * @returns Promise resolving to true if server is ready, false otherwise
 */
export async function isServerReady(config: TestConfig = {}): Promise<boolean> {
  const { baseUrl } = { ...DEFAULT_CONFIG, ...config };

  try {
    const response = await axios.get(`${baseUrl}/ready`, {
      timeout: 1000,
      validateStatus: () => true, // Don't throw on non-2xx responses
    });

    return response.status === 200 && response.data?.ready === true;
  } catch (error) {
    return false;
  }
}

/**
 * Waits for the server to be ready, with exponential backoff
 * @param config Test configuration
 * @returns Promise resolving when server is ready or rejecting after max retries
 */
export async function waitForServerReady(config: TestConfig = {}): Promise<void> {
  const { maxRetries, baseRetryDelay, maxRetryDelay, baseUrl } = { ...DEFAULT_CONFIG, ...config };

  console.log(`Waiting for server to be ready at ${baseUrl}/ready...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Calculate delay with exponential backoff
    const delay = Math.min(baseRetryDelay * Math.pow(1.5, attempt - 1), maxRetryDelay);

    if (await isServerReady(config)) {
      console.log(`Server is ready after ${attempt} attempts`);
      return;
    }

    if (attempt < maxRetries) {
      console.log(`Server not ready (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw new Error(`Server not ready after ${maxRetries} attempts`);
}

/**
 * Gets server health information
 * @param config Test configuration
 * @returns Promise resolving to health data or null if server is not available
 */
export async function getServerHealth(config: TestConfig = {}): Promise<any | null> {
  const { baseUrl } = { ...DEFAULT_CONFIG, ...config };

  try {
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 1000,
      validateStatus: () => true,
    });

    return response.status === 200 ? response.data : null;
  } catch (error) {
    return null;
  }
}

/**
 * Retries a function until it succeeds or maximum retries are reached
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise resolving with the function result or rejecting with the last error
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryCondition?: (error: any) => boolean;
    onRetry?: (error: any, attempt: number, delay: number) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = DEFAULT_CONFIG.maxRetries,
    baseDelay = DEFAULT_CONFIG.baseRetryDelay,
    maxDelay = DEFAULT_CONFIG.maxRetryDelay,
    retryCondition = () => true,
    onRetry = (err, attempt, delay) =>
      console.log(`Attempt ${attempt} failed: ${err}. Retrying in ${delay}ms...`),
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries || !retryCondition(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), maxDelay);
      onRetry(error, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for test helpers that require server connectivity
 * Retries the test function if server connectivity issues are detected
 * @param testFn The test function to execute
 * @param config Test configuration
 * @returns A function suitable for use in Jest tests
 */
export function withServerRetry<T>(
  testFn: () => Promise<T>,
  config: TestConfig = {},
): () => Promise<T> {
  return async () => {
    // First ensure server is ready
    await waitForServerReady(config);

    // Then run the test with retry
    return retry(testFn, {
      maxRetries: config.maxRetries || DEFAULT_CONFIG.maxRetries,
      baseDelay: config.baseRetryDelay || DEFAULT_CONFIG.baseRetryDelay,
      maxDelay: config.maxRetryDelay || DEFAULT_CONFIG.maxRetryDelay,
      // Only retry on network errors or 5xx responses
      retryCondition: (error) => {
        const isNetworkError =
          error.code === 'ECONNREFUSED' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT';
        const isServerError = error.response && error.response.status >= 500;
        return isNetworkError || isServerError;
      },
    });
  };
}
