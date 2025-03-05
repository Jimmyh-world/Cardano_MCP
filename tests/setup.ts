import { spawn } from 'child_process';
import { resolve } from 'path';
import net from 'net';

let mockServer: any;

const waitForServer = (port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, 5000);

    const checkServer = () => {
      const socket = new net.Socket();
      socket.on('error', () => {
        socket.destroy();
        setTimeout(checkServer, 100);
      });

      socket.connect(port, 'localhost', () => {
        socket.destroy();
        clearTimeout(timeout);
        resolve();
      });
    };

    checkServer();
  });
};

beforeAll(async () => {
  console.log('Starting mock server...');
  mockServer = spawn('npx', ['ts-node', 'src/mock/mock-server.ts'], {
    cwd: resolve(__dirname, '..'),
    detached: true,
  });

  mockServer.stdout.on('data', (data: Buffer) => {
    console.log(`Mock server output: ${data}`);
  });

  mockServer.stderr.on('data', (data: Buffer) => {
    console.error(`Mock server error: ${data}`);
  });

  try {
    // Wait for both HTTP and WebSocket servers
    await Promise.all([waitForServer(3000), waitForServer(3001)]);
    console.log('Mock server started successfully');
  } catch (error) {
    console.error('Failed to start mock server:', error);
    throw error;
  }
});

afterAll((done) => {
  console.log('Shutting down mock server...');
  if (mockServer) {
    // Send SIGTERM to process group
    if (process.platform === 'win32') {
      mockServer.kill();
    } else {
      try {
        process.kill(-mockServer.pid, 'SIGTERM');
      } catch (error: any) {
        // Ignore ESRCH error (process already gone)
        if (error.code !== 'ESRCH') {
          throw error;
        }
      }
    }

    // Wait for the process to exit
    mockServer.on('exit', () => {
      mockServer = null;
      // Give some time for ports to be released
      setTimeout(done, 1000);
    });

    // Fallback if process doesn't exit
    setTimeout(() => {
      if (mockServer) {
        mockServer.kill('SIGKILL');
        mockServer = null;
        done();
      }
    }, 3000);
  } else {
    done();
  }
});
