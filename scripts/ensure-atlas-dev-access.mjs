import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(rootDir, 'server/.env');
const atlasApiBaseUrl = 'https://cloud.mongodb.com/api/atlas/v2';
const atlasApiVersion = 'application/vnd.atlas.2025-03-12+json';
const httpStatusMarker = '__HTTP_STATUS__:';

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=');

        if (separatorIndex < 0) {
          return [line, ''];
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      })
  );
};

const log = (message) => {
  console.log(`[atlas-dev-access] ${message}`);
};

const warn = (message) => {
  console.warn(`[atlas-dev-access] ${message}`);
};

const runCurl = (args) => {
  const command = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'curl request failed').trim());
  }

  const output = String(result.stdout || '');
  const markerIndex = output.lastIndexOf(httpStatusMarker);

  if (markerIndex < 0) {
    throw new Error('Unable to read Atlas API response status.');
  }

  const body = output.slice(0, markerIndex).trim();
  const statusCode = Number.parseInt(output.slice(markerIndex + httpStatusMarker.length).trim(), 10);

  return {
    body,
    statusCode
  };
};

const atlasRequest = ({ method = 'GET', pathName, credentials, body = null }) => {
  const args = [
    '--silent',
    '--show-error',
    '--digest',
    '--user',
    `${credentials.publicKey}:${credentials.privateKey}`,
    '--header',
    `Accept: ${atlasApiVersion}`,
    '--request',
    method,
    '--write-out',
    httpStatusMarker + '%{http_code}'
  ];

  if (body !== null) {
    args.push('--header', 'Content-Type: application/json', '--data', JSON.stringify(body));
  }

  args.push(`${atlasApiBaseUrl}${pathName}`);

  const response = runCurl(args);
  const payload = response.body ? JSON.parse(response.body) : null;

  if (response.statusCode === 403) {
    throw new Error(
      'Atlas Administration API rejected this IP. In Atlas Organization Settings, disable ' +
        '"Require IP Access List for the Atlas Administration API" for development or allow your API auth IP.'
    );
  }

  if (response.statusCode >= 400) {
    throw new Error(
      payload?.detail ||
        payload?.error ||
        payload?.reason ||
        `Atlas API request failed with status ${response.statusCode}.`
    );
  }

  return payload;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolvePublicIp = async () => {
  const providers = [
    'https://api.ipify.org?format=text',
    'https://checkip.amazonaws.com',
    'https://icanhazip.com'
  ];

  for (const provider of providers) {
    try {
      const response = await fetch(provider, { cache: 'no-store' });

      if (!response.ok) {
        continue;
      }

      const value = (await response.text()).trim();

      if (/^\d{1,3}(\.\d{1,3}){3}$/u.test(value)) {
        return value;
      }
    } catch {
      // Try the next provider if the current IP service is unavailable.
    }
  }

  throw new Error('Unable to determine the current public IP address.');
};

const encodePathSegment = (value) => encodeURIComponent(value).replace(/%2F/gu, '%252F');

const listProjectAccessEntries = (projectId, credentials) => {
  const payload = atlasRequest({
    pathName: `/groups/${projectId}/accessList?itemsPerPage=500`,
    credentials
  });

  return Array.isArray(payload?.results) ? payload.results : [];
};

const waitForAccessEntry = async ({ commentPrefix, credentials, currentIp, projectId, timeoutMs }) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const entries = listProjectAccessEntries(projectId, credentials);
    const currentEntry = entries.find((entry) => entry?.ipAddress === currentIp);
    const status = String(currentEntry?.status || '').trim().toLowerCase();

    if (currentEntry && (!status || status.includes('active'))) {
      return currentEntry;
    }

    if (status.includes('fail')) {
      throw new Error(`Atlas marked ${currentIp} as failed while applying the IP access list update.`);
    }

    await sleep(2000);
  }

  throw new Error(
    `Timed out waiting for the Atlas access list entry for ${currentIp} to become active.`
  );
};

const deleteStaleManagedEntries = ({ commentPrefix, credentials, currentIp, projectId, entries }) => {
  for (const entry of entries) {
    const entryIp = String(entry?.ipAddress || '').trim();
    const comment = String(entry?.comment || '').trim();

    if (!entryIp || entryIp === currentIp || !comment.startsWith(commentPrefix)) {
      continue;
    }

    try {
      atlasRequest({
        method: 'DELETE',
        pathName: `/groups/${projectId}/accessList/${encodePathSegment(entryIp)}`,
        credentials
      });
      log(`Removed stale managed Atlas IP entry ${entryIp}.`);
    } catch (error) {
      warn(`Could not remove stale managed Atlas IP entry ${entryIp}: ${error.message}`);
    }
  }
};

const resolveProjectId = ({ credentials, projectId, projectName, orgId }) => {
  if (projectId) {
    return projectId;
  }

  if (!projectName || !orgId) {
    return '';
  }

  const payload = atlasRequest({
    pathName: `/groups/byName/${encodeURIComponent(projectName)}?orgId=${encodeURIComponent(orgId)}`,
    credentials
  });

  return String(payload?.id || '').trim();
};

const ensureAtlasDevAccess = async () => {
  const envFromFile = parseEnvFile(envPath);
  const env = {
    ...envFromFile,
    ...process.env
  };
  const autoManageEnabled = parseBoolean(env.ATLAS_DEV_AUTO_ALLOW_CURRENT_IP);

  if (!autoManageEnabled) {
    log('Skipped automatic Atlas IP allowlist update.');
    return;
  }

  if (!String(env.MONGODB_URI || '').includes('mongodb.net')) {
    log('Skipped Atlas IP allowlist update because MongoDB Atlas is not configured.');
    return;
  }

  const credentials = {
    publicKey: String(env.ATLAS_PUBLIC_KEY || '').trim(),
    privateKey: String(env.ATLAS_PRIVATE_KEY || '').trim()
  };

  if (!credentials.publicKey || !credentials.privateKey) {
    warn('ATLAS_PUBLIC_KEY and ATLAS_PRIVATE_KEY are required for automatic Atlas IP updates.');
    return;
  }

  const projectId = resolveProjectId({
    credentials,
    projectId: String(env.ATLAS_PROJECT_ID || '').trim(),
    projectName: String(env.ATLAS_PROJECT_NAME || '').trim(),
    orgId: String(env.ATLAS_ORG_ID || '').trim()
  });

  if (!projectId) {
    warn('Set ATLAS_PROJECT_ID or provide both ATLAS_PROJECT_NAME and ATLAS_ORG_ID.');
    return;
  }

  const currentIp = await resolvePublicIp();
  const commentPrefix = String(env.ATLAS_DEV_ACCESS_COMMENT_PREFIX || 'tricore-dev-auto').trim();
  const deleteStale = parseBoolean(env.ATLAS_DEV_ACCESS_DELETE_STALE, true);
  const waitTimeoutMs = Number.parseInt(env.ATLAS_DEV_ACCESS_WAIT_TIMEOUT_MS || '90000', 10);
  const comment = `${commentPrefix} ${os.hostname()} ${new Date().toISOString()}`;
  const entries = listProjectAccessEntries(projectId, credentials);
  const currentEntry = entries.find((entry) => entry?.ipAddress === currentIp);

  if (currentEntry) {
    log(`Current IP ${currentIp} is already present in the Atlas project access list.`);
  } else {
    atlasRequest({
      method: 'POST',
      pathName: `/groups/${projectId}/accessList`,
      credentials,
      body: [
        {
          ipAddress: currentIp,
          comment
        }
      ]
    });
    log(`Added current IP ${currentIp} to the Atlas project access list.`);
  }

  if (deleteStale) {
    deleteStaleManagedEntries({
      commentPrefix,
      credentials,
      currentIp,
      projectId,
      entries
    });
  }

  if (process.argv.includes('--wait')) {
    await waitForAccessEntry({
      commentPrefix,
      credentials,
      currentIp,
      projectId,
      timeoutMs: Number.isFinite(waitTimeoutMs) ? waitTimeoutMs : 90000
    });
    log(`Atlas project access list entry for ${currentIp} is active.`);
  }
};

try {
  await ensureAtlasDevAccess();
} catch (error) {
  // Never block local development because Atlas IP automation is only a convenience layer.
  warn(error.message);
}
