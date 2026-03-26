import os from 'node:os';

const mode = String(process.argv[2] || 'lan').trim().toLowerCase();

const isPrivateLanAddress = (address) =>
  address.startsWith('10.') ||
  address.startsWith('192.168.') ||
  /^172\.(1[6-9]|2\d|3[0-1])\./u.test(address);

const getLanIp = () => {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== 'IPv4' || entry.internal || !entry.address) {
        continue;
      }

      if (entry.address.startsWith('169.254.')) {
        continue;
      }

      candidates.push(entry.address);
    }
  }

  const preferred = candidates.find((address) => isPrivateLanAddress(address));
  return preferred || candidates[0] || '127.0.0.1';
};

const getPublicIp = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.ipify.org?format=text', {
      signal: controller.signal
    });

    if (!response.ok) {
      return 'Unknown';
    }

    const value = (await response.text()).trim();
    return value || 'Unknown';
  } catch {
    return 'Unknown';
  } finally {
    clearTimeout(timeout);
  }
};

if (mode === 'public') {
  console.log(await getPublicIp());
} else {
  console.log(getLanIp());
}
