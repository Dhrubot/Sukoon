/**
 * Production-safe logger utility.
 * No-ops all output when __DEV__ is false.
 */

const noop = () => {};

const logger = {
  log: __DEV__ ? console.log.bind(console) : noop,
  warn: __DEV__ ? console.warn.bind(console) : noop,
  error: console.error.bind(console), // always log errors
  info: __DEV__ ? console.info.bind(console) : noop,
  debug: __DEV__ ? console.debug.bind(console) : noop,
};

export default logger;
