import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';
import net from 'net';
import axios from 'axios';

// Configurable timeout with env var and longer default
const SERVER_STARTUP_TIMEOUT_MS = parseInt(process.env.SERVER_STARTUP_TIMEOUT || '15000', 10);
const SERVER_SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SERVER_SHUTDOWN_TIMEOUT || '5000', 10);
const SERVER_STARTUP_CHECK_INTERVAL_MS = parseInt(process.env.SERVER_CHECK_INTERVAL || '300', 10);
const HTTP_PORT = 3000;
const WS_PORT = 3001;

let mockServer: ChildProcess | null = null;
// Track open handles to ensure they're closed
let openHandles: Array<{ type: string; handle: any; close: () => void }> = [];

/**
 * Creates a promise that rejects after a timeout
 * @param ms Timeout in milliseconds
 * @param message Error message
 */
const createTimeout = (ms: number, message: string): Promise<never> => {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    // Store the timer so we can clear it later
    openHandles.push({
      type: 'timeout',
      handle: timer,
      close: () => clearTimeout(timer),
    });
  });
};

/**
 * Waits for the server to be ready by checking the /ready endpoint
 */
const waitForServerReady = async (
  maxAttempts: number = 10,
  baseDelay: number = SERVER_STARTUP_CHECK_INTERVAL_MS,
): Promise<void> => {
  console.log('Waiting for server to be ready...');

  let attempt = 0;
  const startTime = Date.now();

  while (attempt < maxAttempts) {
    attempt++;
    const delay = baseDelay * Math.pow(1.5, attempt - 1);

    try {
      const response = await axios.get('http://localhost:3000/ready');
      if (response.data.ready) {
        console.log('Server is ready');
        return;
      }
      console.log('Server not ready yet, waiting...');
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed > SERVER_STARTUP_TIMEOUT_MS) {
        throw new Error(`Server startup timeout after ${elapsed}ms. Last error: ${err}`);
      }

      console.log(
        `Server not ready (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Server failed to become ready after ${maxAttempts} attempts`);
};

/**
 * Helper function to clean up any open handles
 */
const cleanupHandles = () => {
  if (openHandles.length > 0) {
    console.log(`Cleaning up ${openHandles.length} open handles...`);

    // Close all open handles
    openHandles.forEach((handle) => {
      try {
        console.log(`Closing handle of type ${handle.type}`);
        handle.close();

        // Force destroy for sockets
        if (
          handle.type === 'socket' &&
          handle.handle &&
          typeof handle.handle.destroy === 'function'
        ) {
          handle.handle.destroy();
        }
      } catch (err) {
        console.error(`Error closing handle of type ${handle.type}:`, err);
      }
    });

    // Clear the handles array
    openHandles = [];
  }

  // Force cleanup of any remaining handles
  if (mockServer) {
    try {
      // Close stdin/stdout/stderr
      ['stdin', 'stdout', 'stderr'].forEach((stream) => {
        if (mockServer && mockServer[stream]) {
          mockServer[stream].destroy();
        }
      });
    } catch (err) {
      console.error('Error cleaning up server streams:', err);
    }
  }
};

/**
 * Stops the mock server if it's running
 */
export const stopMockServer = async (): Promise<void> => {
  if (!mockServer) {
    console.log('Mock server is not running, nothing to stop');
    return;
  }

  console.log('Stopping mock server...');

  try {
    // First try to gracefully stop the server
    if (process.platform === 'win32') {
      mockServer.kill('SIGTERM');
    } else if (mockServer.pid !== undefined) {
      try {
        process.kill(-mockServer.pid, 'SIGTERM');
      } catch (error) {
        // If process group kill fails, try direct process kill
        try {
          process.kill(mockServer.pid, 'SIGTERM');
        } catch (innerError) {
          console.error('Error killing server process:', innerError);
        }
      }
    }

    // Wait for server to exit or force kill after timeout
    let shutdownTimeout: NodeJS.Timeout;
    await Promise.race([
      new Promise<void>((resolve) => {
        if (mockServer) {
          mockServer.once('exit', () => {
            console.log('Mock server exited gracefully');
            mockServer = null;
            resolve();
          });
        } else {
          resolve();
        }
      }),
      new Promise<void>((_, reject) => {
        shutdownTimeout = setTimeout(() => {
          if (mockServer) {
            console.log('Mock server exit timeout, forcing kill');
            try {
              if (process.platform === 'win32') {
                mockServer.kill('SIGKILL');
              } else if (mockServer.pid !== undefined) {
                try {
                  process.kill(-mockServer.pid, 'SIGKILL');
                } catch (error) {
                  process.kill(mockServer.pid, 'SIGKILL');
                }
              }
            } catch (error) {
              console.error('Error during force kill:', error);
            }
            mockServer = null;
          }
          reject(new Error('Mock server exit timeout'));
        }, SERVER_SHUTDOWN_TIMEOUT_MS);
        // Store the timeout in open handles for cleanup
        openHandles.push({
          type: 'shutdown-timeout',
          handle: shutdownTimeout,
          close: () => clearTimeout(shutdownTimeout),
        });
      }).catch(() => {
        // Convert rejection to resolution after force kill
        return Promise.resolve();
      }),
    ]);
  } catch (error) {
    console.error('Error stopping mock server:', error);
    if (mockServer) {
      try {
        mockServer.kill('SIGKILL');
      } catch (killError) {
        console.error('Error during final kill attempt:', killError);
      }
      mockServer = null;
    }
  } finally {
    // Always clean up handles regardless of how the server was stopped
    cleanupHandles();
  }
};

// Set up before all tests
beforeAll(async () => {
  console.log('Starting mock server...');

  try {
    // Start the server process
    mockServer = spawn('npx', ['ts-node', 'src/mock/mock-server.ts'], {
      cwd: resolve(__dirname, '..'),
      detached: true,
      env: { ...process.env, SERVER_READY_LOG: 'true' },
    });

    // Monitor server output for startup issues
    let serverOutput = '';

    // Add null check for TypeScript
    if (mockServer && mockServer.stdout) {
      mockServer.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        serverOutput += output;
        console.log(`Mock server output: ${output}`);
      });
    }

    if (mockServer && mockServer.stderr) {
      mockServer.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        serverOutput += output;
        console.error(`Mock server error: ${output}`);
      });
    }

    // Create a promise that will reject after the timeout
    const timeoutPromise = createTimeout(
      SERVER_STARTUP_TIMEOUT_MS,
      `Server startup timeout after ${SERVER_STARTUP_TIMEOUT_MS}ms. Server output: ${serverOutput}`,
    );

    // Wait for server to be ready
    await Promise.race([waitForServerReady(), timeoutPromise]);

    // Clean up the timeout since server is ready
    cleanupHandles();

    console.log('Mock server started successfully');
  } catch (error) {
    console.error('Failed to start mock server:', error);

    // Attempt to clean up the server process if it exists
    if (mockServer) {
      try {
        if (process.platform === 'win32') {
          mockServer.kill();
        } else if (mockServer.pid !== undefined) {
          process.kill(-mockServer.pid, 'SIGTERM');
        }
      } catch (killError) {
        console.error('Error killing mock server process:', killError);
      }
      mockServer = null;
    }

    // Clean up any open handles
    cleanupHandles();

    throw error;
  }
});

// Add console logging to help identify issues
console.log('Cleaning up for Jest exit...');

// Clear up after all tests
afterAll(async () => {
  console.log('Shutting down mock server...');
  await stopMockServer();
});
