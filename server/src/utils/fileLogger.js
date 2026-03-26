import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, '../../logs');
const maxLogFileBytes = 1024 * 1024;
const writeQueues = new Map();
let consolePatched = false;

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
};

const serializePart = (value) => {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const formatLogLine = (level, values) =>
  `[${new Date().toISOString()}] [${level.toUpperCase()}] ${values.map(serializePart).join(' ')}\n`;

const trimLogFile = async (filePath) => {
  const stats = await fs.stat(filePath);

  if (stats.size <= maxLogFileBytes) {
    return;
  }

  const bytesToKeep = maxLogFileBytes;
  const start = Math.max(0, stats.size - bytesToKeep);
  const handle = await fs.open(filePath, 'r');
  const buffer = Buffer.alloc(bytesToKeep);

  try {
    const { bytesRead } = await handle.read(buffer, 0, bytesToKeep, start);
    let nextContent = buffer.subarray(0, bytesRead);
    const firstNewLineIndex = nextContent.indexOf(0x0a);

    if (firstNewLineIndex >= 0 && firstNewLineIndex < nextContent.length - 1) {
      nextContent = nextContent.subarray(firstNewLineIndex + 1);
    }

    await fs.writeFile(filePath, nextContent);
  } finally {
    await handle.close();
  }
};

const queueWrite = async (filePath, content) => {
  const previous = writeQueues.get(filePath) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.appendFile(filePath, content, 'utf8');
      await trimLogFile(filePath);
    });

  writeQueues.set(filePath, next);

  try {
    await next;
  } catch (error) {
    originalConsole.error('File logging warning:', error.message);
  }
};

export const getLogFilePath = (fileName) => path.resolve(logsDir, fileName);

export const appendLogLine = async (fileName, content) => {
  await queueWrite(getLogFilePath(fileName), content);
};

export const createMorganStream = (fileName) => ({
  write: (message) => {
    void appendLogLine(fileName, message.endsWith('\n') ? message : `${message}\n`);
  }
});

export const initializeFileLogging = () => {
  if (consolePatched) {
    return;
  }

  consolePatched = true;

  console.log = (...values) => {
    originalConsole.log(...values);
    void appendLogLine('app.log', formatLogLine('info', values));
  };

  console.info = (...values) => {
    originalConsole.info(...values);
    void appendLogLine('app.log', formatLogLine('info', values));
  };

  console.debug = (...values) => {
    originalConsole.debug(...values);
    void appendLogLine('app.log', formatLogLine('debug', values));
  };

  console.warn = (...values) => {
    originalConsole.warn(...values);
    const line = formatLogLine('warn', values);
    void appendLogLine('app.log', line);
    void appendLogLine('error.log', line);
  };

  console.error = (...values) => {
    originalConsole.error(...values);
    const line = formatLogLine('error', values);
    void appendLogLine('app.log', line);
    void appendLogLine('error.log', line);
  };
};
