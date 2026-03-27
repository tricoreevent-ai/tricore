import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import routes from './routes/index.js';
import { buildRobotsTxt, buildSitemapXml } from './services/searchDiscoveryService.js';
import { observeApiRequest } from './services/securityAlertService.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const uploadsPath = path.resolve(__dirname, '../uploads');
const hasClientBuild = fs.existsSync(path.join(clientDistPath, 'index.html'));

app.use(
  cors({
    origin: env.clientUrl.split(',').map((origin) => origin.trim()),
    credentials: true
  })
);
app.use(
  helmet({
    // Google Identity Services popup needs access to window.opener when it
    // returns from accounts.google.com in production.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
  })
);
app.use(express.json({ limit: '100mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    if (!req.originalUrl.startsWith('/api')) {
      return;
    }

    void observeApiRequest({
      method: req.method,
      path: req.originalUrl,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
});
app.use(
  '/uploads',
  express.static(uploadsPath, {
    etag: true,
    immutable: true,
    maxAge: '365d'
  })
);

app.get('/robots.txt', async (_req, res) => {
  res.type('text/plain');
  res.send(await buildRobotsTxt());
});

app.get('/sitemap.xml', async (_req, res) => {
  res.type('application/xml');
  res.send(await buildSitemapXml());
});

app.use('/api', routes);

if (env.nodeEnv === 'production' && hasClientBuild) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
