import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '../server');
const watchTargets = [path.join(serverDir, 'src'), path.join(serverDir, '.env')];

let childProcess = null;
let isStopping = false;
let isRestartPending = false;
let restartTimer = null;
let crashRestartAttempts = 0;
let crashWindowStartedAt = 0;

const log = (message) => {
  console.log(`[server-dev] ${message}`);
};

const scheduleRestart = (reason) => {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    log(`Restarting server due to ${reason}.`);

    if (childProcess) {
      isRestartPending = true;
      childProcess.kill('SIGTERM');

      setTimeout(() => {
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGKILL');
        }
      }, 5000).unref?.();

      return;
    }

    startServer();
  }, 180);
};

const shouldAutoRestartAfterCrash = () => {
  const now = Date.now();

  if (!crashWindowStartedAt || now - crashWindowStartedAt > 30000) {
    crashWindowStartedAt = now;
    crashRestartAttempts = 0;
  }

  crashRestartAttempts += 1;
  return crashRestartAttempts <= 3;
};

const startServer = () => {
  log('Starting backend server...');
  childProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: serverDir,
    stdio: 'inherit',
    env: process.env
  });

  childProcess.once('exit', (code, signal) => {
    const restarting = isRestartPending;
    childProcess = null;
    isRestartPending = false;

    if (isStopping) {
      return;
    }

    if (restarting) {
      setTimeout(() => {
        if (!isStopping) {
          startServer();
        }
      }, 300);
      return;
    }

    if (code === 0) {
      log('Backend server stopped cleanly. Waiting for file changes...');
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    log(`Backend server exited unexpectedly (${reason}).`);

    if (shouldAutoRestartAfterCrash()) {
      log('Attempting automatic restart...');
      setTimeout(() => {
        if (!isStopping) {
          startServer();
        }
      }, 1000);
      return;
    }

    log('Too many quick crashes. Waiting for file changes before retrying.');
  });
};

const createWatcher = (targetPath) => {
  const relativeTarget = path.relative(serverDir, targetPath) || path.basename(targetPath);

  try {
    return fs.watch(
      targetPath,
      { recursive: fs.statSync(targetPath).isDirectory() },
      (_eventType, fileName) => {
        const nextPath = fileName
          ? path.join(relativeTarget, String(fileName))
          : relativeTarget;

        scheduleRestart(nextPath);
      }
    );
  } catch (error) {
    log(`Watcher warning for ${relativeTarget}: ${error.message}`);
    return null;
  }
};

const watchers = watchTargets.map(createWatcher).filter(Boolean);

const shutdown = (signal) => {
  isStopping = true;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }

  for (const watcher of watchers) {
    watcher.close();
  }

  if (!childProcess) {
    process.exit(0);
    return;
  }

  childProcess.once('exit', () => {
    process.exit(0);
  });

  childProcess.kill(signal);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
