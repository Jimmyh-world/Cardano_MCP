import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';
import net from 'net';

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
 * Attempts to connect to a server with exponential backoff
 * @param port Port to connect to
 * @param maxAttempts Maximum number of connection attempts
 * @param baseDelay Base delay between attempts (will be multiplied by 1.5^attempt)
 */
const waitForServer = async (
  port: number,
  maxAttempts: number = 10,
  baseDelay: number = SERVER_STARTUP_CHECK_INTERVAL_MS,
): Promise<void> => {
  console.log(`Waiting for server on port ${port}...`);

  let attempt = 0;
  const startTime = Date.now();

  while (attempt < maxAttempts) {
    attempt++;
    const delay = baseDelay * Math.pow(1.5, attempt - 1);

    try {
      await new Promise<void>((resolve, reject) => {
        console.log(`Attempt ${attempt}/${maxAttempts} to connect to port ${port}`);
        const socket = new net.Socket();
        let socketClosed = false;

        // Add socket to open handles
        const handleIndex =
          openHandles.push({
            type: 'socket',
            handle: socket,
            close: () => {
              if (!socketClosed) {
                socketClosed = true;
                socket.destroy();
              }
            },
          }) - 1;

        // Handle connection errors
        socket.on('error', (err) => {
          socketClosed = true;
          socket.destroy();
          openHandles.splice(handleIndex, 1);
          reject(err);
        });

        // Handle successful connection
        socket.connect(port, 'localhost', () => {
          socketClosed = true;
          socket.destroy();
          openHandles.splice(handleIndex, 1);
          console.log(`Successfully connected to server on port ${port}`);
          resolve();
        });

        // Set a timeout for this specific connection attempt
        setTimeout(() => {
          if (!socketClosed) {
            socketClosed = true;
            socket.destroy();
            openHandles.splice(handleIndex, 1);
            reject(new Error(`Connection attempt ${attempt} timed out`));
          }
        }, delay);
      });

      // If we get here, connection was successful
      return;
    } catch (err) {
      const elapsed = Date.now() - startTime;
      // Check if we've exceeded the overall timeout
      if (elapsed > SERVER_STARTUP_TIMEOUT_MS) {
        throw new Error(
          `Server startup timeout after ${elapsed}ms waiting for port ${port}. Last error: ${err}`,
        );
      }

      console.log(`Connection attempt ${attempt} failed: ${err}. Retrying in ${delay}ms...`);

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Failed to connect to server on port ${port} after ${maxAttempts} attempts`);
};

/**
 * Cleans up all open handles
 */
const cleanupHandles = () => {
  console.log(`Cleaning up ${openHandles.length} open handles...`);
  openHandles.forEach((handle) => {
    try {
      handle.close();
    } catch (err) {
      console.error(`Error closing ${handle.type} handle:`, err);
    }
  });
  openHandles = [];
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

    // Wait for both HTTP and WebSocket servers with timeout
    await Promise.race([
      Promise.all([waitForServer(HTTP_PORT), waitForServer(WS_PORT)]),
      timeoutPromise,
    ]);

    // Clean up the timeout since servers are ready
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

// Clean up after all tests
afterAll((done) => {
  console.log('Shutting down mock server...');

  const shutdownTimeout = setTimeout(() => {
    console.error(`Server shutdown timed out after ${SERVER_SHUTDOWN_TIMEOUT_MS}ms`);

    // Force cleanup of any remaining handles
    cleanupHandles();

    // Kill the server if it's still running
    if (mockServer) {
      console.log('Forcefully terminating server process with SIGKILL');
      if (process.platform === 'win32') {
        mockServer.kill('SIGKILL');
      } else if (mockServer.pid !== undefined) {
        try {
          process.kill(-mockServer.pid, 'SIGKILL');
        } catch (error: any) {
          // Just log errors, don't prevent test completion
          console.error('Error killing server process:', error);
        }
      }
      mockServer = null;
    }

    done();
  }, SERVER_SHUTDOWN_TIMEOUT_MS);

  // Clean function to be called when server exits or on timeout
  const cleanup = () => {
    clearTimeout(shutdownTimeout);
    mockServer = null;
    cleanupHandles();
    done();
  };

  if (mockServer) {
    // Register exit handler before sending signal
    mockServer.on('exit', () => {
      console.log('Mock server process exited');
      cleanup();
    });

    // Send termination signal appropriate for the platform
    try {
      if (process.platform === 'win32') {
        mockServer.kill();
      } else if (mockServer.pid !== undefined) {
        process.kill(-mockServer.pid, 'SIGTERM');
      }
    } catch (error: any) {
      // Ignore ESRCH error (process already gone)
      if (error.code !== 'ESRCH') {
        console.error('Error during server shutdown:', error);
      }
      cleanup();
    }
  } else {
    console.log('No mock server to shut down');
    cleanup();
  }
});
