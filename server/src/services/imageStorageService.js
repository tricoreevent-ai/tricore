import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

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

const isSvgMimeType = (mimeType) => mimeType === 'image/svg+xml';
const shouldKeepOriginalBinary = (mimeType) =>
  ['image/gif', 'image/svg+xml', 'image/x-icon'].includes(mimeType);

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

const optimizeRasterImage = async (
  buffer,
  {
    maxHeight = null,
    maxWidth = 1920,
    quality = 82
  } = {}
) => {
  const image = sharp(buffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();

  if (!metadata.width && !metadata.height) {
    return {
      buffer,
      extension: 'bin'
    };
  }

  const pipeline = image.resize({
    fit: 'inside',
    height: maxHeight,
    width: maxWidth,
    withoutEnlargement: true
  });
  const optimizedBuffer = await pipeline.webp({ quality }).toBuffer();

  return {
    buffer: optimizedBuffer,
    extension: 'webp'
  };
};

export const isImageDataUrl = (value) => Boolean(parseDataUrl(value));
export const isUploadPath = (value) => /^\/uploads\//.test(normalizeText(value));

const writeImageFile = async (
  parsed,
  {
    folder = 'misc',
    filenamePrefix = 'image',
    maxHeight = null,
    maxWidth = 1920,
    quality = 82
  } = {}
) => {
  const safeFolder = normalizeSegment(folder, 'misc');
  const safePrefix = normalizeSegment(filenamePrefix, 'image');
  const absoluteFolder = path.join(uploadsRoot, safeFolder);
  let fileBuffer = parsed.buffer;
  let extension = getFileExtension(parsed.mimeType);

  if (!shouldKeepOriginalBinary(parsed.mimeType) && !isSvgMimeType(parsed.mimeType)) {
    try {
      const optimizedImage = await optimizeRasterImage(parsed.buffer, {
        maxHeight,
        maxWidth,
        quality
      });
      fileBuffer = optimizedImage.buffer;
      extension = optimizedImage.extension;
    } catch {
      fileBuffer = parsed.buffer;
      extension = getFileExtension(parsed.mimeType);
    }
  }

  const filename = `${safePrefix}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(absoluteFolder, filename);

  await fs.mkdir(absoluteFolder, { recursive: true });
  await fs.writeFile(absolutePath, fileBuffer);

  return `/${path.posix.join('uploads', safeFolder, filename)}`;
};

export const persistImageReference = async (
  value,
  {
    folder = 'misc',
    filenamePrefix = 'image',
    maxHeight = null,
    maxWidth = 1920,
    quality = 82
  } = {}
) => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  const parsed = parseDataUrl(normalizedValue);

  if (!parsed) {
    return normalizedValue;
  }

  return writeImageFile(parsed, {
    folder,
    filenamePrefix,
    maxHeight,
    maxWidth,
    quality
  });
};
