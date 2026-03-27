import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { fileURLToPath } from 'node:url';

import FileStreamRotator from 'file-stream-rotator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, '../../../logs');
const systemLogBasePath = path.resolve(logsDir, 'system');
const systemLogAuditPath = path.resolve(logsDir, 'system-audit.json');

let loggingInitialized = false;
let systemLogStream = null;

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
};

const originalProcessWrite = {
  stdout: process.stdout.write.bind(process.stdout),
  stderr: process.stderr.write.bind(process.stderr)
};

const ensureLogsDirectory = () => {
  fs.mkdirSync(logsDir, { recursive: true });
};

const writeDiagnostic = (message, error) => {
  const suffix = error ? ` ${error.stack || error.message || String(error)}` : '';

  try {
    originalProcessWrite.stderr(`[file-logger] ${message}${suffix}\n`);
  } catch {
    // Ignore logging diagnostics failures to avoid recursive write issues.
  }
};

const getSystemLogStream = () => {
  if (systemLogStream) {
    return systemLogStream;
  }

  ensureLogsDirectory();

  systemLogStream = FileStreamRotator.getStream({
    filename: systemLogBasePath,
    size: '1M',
    max_logs: '10',
    audit_file: systemLogAuditPath,
    extension: '.log',
    end_stream: true,
    file_options: { flags: 'a' }
  });

  systemLogStream.on('error', (error) => {
    writeDiagnostic('Rotating log stream error.', error);
  });

  return systemLogStream;
};

const writeToSystemLog = (chunk, encoding) => {
  try {
    const stream = getSystemLogStream();

    if (typeof chunk === 'string') {
      stream.write(chunk, typeof encoding === 'string' ? encoding : 'utf8');
      return;
    }

    if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
      stream.write(chunk);
      return;
    }

    if (chunk !== undefined && chunk !== null) {
      stream.write(Buffer.from(String(chunk), 'utf8'));
    }
  } catch (error) {
    writeDiagnostic('Unable to append to the rotating system log.', error);
  }
};

const formatConsoleMessage = (level, values) =>
  `[${new Date().toISOString()}] [${level.toUpperCase()}] ${util.formatWithOptions(
    { colors: process.stdout.isTTY },
    ...values
  )}`;

const patchConsoleMethods = () => {
  console.log = (...values) => {
    originalConsole.log(formatConsoleMessage('info', values));
  };

  console.info = (...values) => {
    originalConsole.info(formatConsoleMessage('info', values));
  };

  console.debug = (...values) => {
    originalConsole.debug(formatConsoleMessage('debug', values));
  };

  console.warn = (...values) => {
    originalConsole.warn(formatConsoleMessage('warn', values));
  };

  console.error = (...values) => {
    originalConsole.error(formatConsoleMessage('error', values));
  };
};

const patchProcessStreams = () => {
  process.stdout.write = (chunk, encoding, callback) => {
    writeToSystemLog(chunk, encoding);
    return originalProcessWrite.stdout(chunk, encoding, callback);
  };

  process.stderr.write = (chunk, encoding, callback) => {
    writeToSystemLog(chunk, encoding);
    return originalProcessWrite.stderr(chunk, encoding, callback);
  };
};

export const getLogsDirectoryPath = () => logsDir;

export const initializeFileLogging = () => {
  if (loggingInitialized) {
    return;
  }

  getSystemLogStream();
  patchProcessStreams();
  patchConsoleMethods();
  loggingInitialized = true;
};
