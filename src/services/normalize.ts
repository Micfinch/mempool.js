export const normalizeHostname = (hostname?: string): string => {
  const value = (hostname ?? '').trim();

  if (value.length === 0) {
    throw new TypeError('hostname must be a non-empty string');
  }

  try {
    return new URL(value).host;
  } catch {
    return value.replace(/^(https?:\/\/|wss?:\/\/)/, '').replace(/\/+$/, '');
  }
};

export const normalizeAddress = (address: string): string => {
  const value = address.trim();

  if (value.length === 0) {
    throw new TypeError('address must be a non-empty string');
  }

  const extractFromPath = (pathname: string) => {
    const pattern = /\/address\/([^/?#]+)/g;
    let match: RegExpExecArray | null = null;
    let currentMatch: RegExpExecArray | null = pattern.exec(pathname);

    while (currentMatch) {
      match = currentMatch;
      currentMatch = pattern.exec(pathname);
    }

    return match ? decodeURIComponent(match[1]) : undefined;
  };

  try {
    const extracted = extractFromPath(new URL(value).pathname);
    if (extracted) {
      return extracted;
    }
  } catch {
    // fall back to raw string parsing below
  }

  const extracted = extractFromPath(value);
  if (extracted) {
    return extracted;
  }

  return value;
};

export const normalizeTxId = (txid: string): string => {
  const value = txid.trim();

  if (value.length === 0) {
    throw new TypeError('txid must be a non-empty string');
  }

  const extractFromPath = (pathname: string) => {
    const pattern = /\/tx\/([^/?#]+)/g;
    let match: RegExpExecArray | null = null;
    let currentMatch: RegExpExecArray | null = pattern.exec(pathname);

    while (currentMatch) {
      match = currentMatch;
      currentMatch = pattern.exec(pathname);
    }

    return match ? decodeURIComponent(match[1]) : undefined;
  };

  try {
    const extracted = extractFromPath(new URL(value).pathname);
    if (extracted) {
      return extracted;
    }
  } catch {
    // fall back to raw string parsing below
  }

  const extracted = extractFromPath(value);
  if (extracted) {
    return extracted;
  }

  return value;
};
