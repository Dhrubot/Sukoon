/**
 * Production-safe logger utility.
 * In production: only error() is active, and it sanitizes args to avoid
 * leaking PII (coordinates, settings objects) into device logs.
 */

const noop = () => {};

/**
 * In production, strip non-string/non-Error args to prevent PII leakage.
 * Keeps the error message but drops raw objects (settings, location, etc.).
 */
const sanitizedError = (...args: unknown[]) => {
  const safe = args.map((arg) => {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
    // Drop raw objects/arrays that may contain coordinates, settings, etc.
    return '[redacted]';
  });
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
