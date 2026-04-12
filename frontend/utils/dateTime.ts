const IST_TIMEZONE = 'Asia/Kolkata';

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const formatDateInIST = (
  value?: string,
  options?: Intl.DateTimeFormatOptions,
  fallback = '-'
) => {
  const parsed = parseDate(value);
  if (!parsed) return fallback;

  return parsed.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...options,
  });
};

export const formatDateTimeInIST = (
  value?: string,
  options?: Intl.DateTimeFormatOptions,
  fallback = 'Waiting'
) => {
  const parsed = parseDate(value);
  if (!parsed) return fallback;

  return parsed.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
};
