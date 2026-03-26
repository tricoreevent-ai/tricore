import net from 'node:net';

const ports = process.argv.slice(2).map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);

if (ports.length === 0) {
  console.error('No ports were provided.');
  process.exit(1);
}

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });

const busyPorts = [];

for (const port of ports) {
  if (!(await isPortFree(port))) {
    busyPorts.push(port);
  }
}

if (busyPorts.length > 0) {
  console.error(
    `The following local ports are already in use: ${busyPorts.join(', ')}. Close the existing app instance and try again.`
  );
  process.exit(1);
}
