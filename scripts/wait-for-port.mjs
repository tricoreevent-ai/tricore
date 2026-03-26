import net from 'node:net';

const host = process.argv[2] || '127.0.0.1';
const port = Number.parseInt(process.argv[3] || '5000', 10);
const timeoutMs = Number.parseInt(process.argv[4] || '30000', 10);
const startedAt = Date.now();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const canConnect = () =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });

while (Date.now() - startedAt < timeoutMs) {
  if (await canConnect()) {
    process.exit(0);
  }

  await sleep(250);
}

console.error(`Timed out waiting for ${host}:${port} after ${timeoutMs}ms.`);
process.exit(1);
