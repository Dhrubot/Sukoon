/**
 * Production-safe logger utility.
 * In production: only error() is active, and it sanitizes args to avoid
 * leaking PII (coordinates, settings objects) into device logs.
 */

const noop = () => {};

export function sanitizeLogText(value: string): string {
  return value
    .replace(/"[^"]*"/g, '"[redacted]"')
    .replace(/-?\d{1,3}\.\d{3,}/g, '[redacted-number]')
    .replace(/\b(?:lat|latitude|lng|longitude|coords|coordinate|location)\b\s*[:=]\s*[^\s,;]+/gi, '[redacted-location]');
}

function sanitizeLogArg(arg: unknown): string {
  if (typeof arg === 'string') {
    return sanitizeLogText(arg);
  }

  if (arg instanceof Error) {
    return `${arg.name}: ${sanitizeLogText(arg.message)}`;
  }

  return '[redacted]';
}

/**
 * In production, strip non-string/non-Error args to prevent PII leakage.
 * Keeps the error message but drops raw objects (settings, location, etc.).
 */
const sanitizedError = (...args: unknown[]) => {
  const safe = args.map(sanitizeLogArg);
  console.error(...safe);
};

const logger = {
  log: __DEV__ ? console.log.bind(console) : noop,
  warn: __DEV__ ? console.warn.bind(console) : noop,
  error: __DEV__ ? console.error.bind(console) : sanitizedError,
  info: __DEV__ ? console.info.bind(console) : noop,
  debug: __DEV__ ? console.debug.bind(console) : noop,
};

export default logger;
