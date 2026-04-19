type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null;
}

function flattenMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => flattenMessage(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join('\n') : null;
  }

  if (isRecord(value)) {
    const direct =
      flattenMessage(value.msg) ??
      flattenMessage(value.detail) ??
      flattenMessage(value.message);
    if (direct) {
      return direct;
    }
  }

  return null;
}

export function normalizeMessage(value: unknown, fallback: string): string {
  return flattenMessage(value) ?? fallback;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response)) {
      const data = response.data;
      if (isRecord(data)) {
        return normalizeMessage(data.detail, fallback);
      }
      return normalizeMessage(data, fallback);
    }

    return normalizeMessage(error.message, fallback);
  }

  return fallback;
}

export function extractErrorCode(error: unknown): string | null {
  if (!isRecord(error)) {
    return null;
  }

  const response = error.response;
  if (isRecord(response)) {
    const data = response.data;
    if (isRecord(data)) {
      const candidate = normalizeMessage(
        data.code ?? data.error_code ?? data.errorCode,
        '',
      ).trim();
      if (candidate) {
        return candidate.toUpperCase();
      }
    }

    const status = response.status;
    if (typeof status === 'number' && Number.isFinite(status)) {
      return `HTTP_${status}`;
    }
  }

  const candidate = normalizeMessage(error.code, '').trim();
  if (candidate) {
    return candidate.toUpperCase();
  }

  return null;
}
