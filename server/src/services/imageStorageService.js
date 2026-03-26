import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(currentDir, '../../uploads');
const dataUrlPattern = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

const extensionMap = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/x-icon': 'ico'
};

const normalizeText = (value) => String(value || '').trim();

const normalizeSegment = (value, fallback) => {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
};

const getFileExtension = (mimeType) =>
  extensionMap[mimeType] || normalizeSegment(mimeType.split('/')[1]?.split('+')[0], 'img');

const parseDataUrl = (value) => {
  const match = normalizeText(value).match(dataUrlPattern);

  if (!match) {
    return null;
  }

  const [, mimeType, encoded] = match;

  return {
    mimeType,
    buffer: Buffer.from(encoded, 'base64')
  };
};

export const persistImageReference = async (
  value,
  { folder = 'misc', filenamePrefix = 'image' } = {}
) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  const parsed = parseDataUrl(normalizedValue);

  if (!parsed) {
    return normalizedValue;
  }

  const safeFolder = normalizeSegment(folder, 'misc');
  const safePrefix = normalizeSegment(filenamePrefix, 'image');
  const extension = getFileExtension(parsed.mimeType);
  const filename = `${safePrefix}-${randomUUID()}.${extension}`;
  const absoluteFolder = path.join(uploadsRoot, safeFolder);
  const absolutePath = path.join(absoluteFolder, filename);

  await fs.mkdir(absoluteFolder, { recursive: true });
  await fs.writeFile(absolutePath, parsed.buffer);

  return `/${path.posix.join('uploads', safeFolder, filename)}`;
};
