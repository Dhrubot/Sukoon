const ALLOWED_WARN_PATTERNS = [
  /Edge prayer time fetch unavailable, falling back to direct provider:/,
  /SecureStore did not contain a key; generated a new device-bound key/,
  /Secure storage degraded to MMKV fallback/,
  /notification cancellations failed/,
  /Notification permission not granted/,
  /Failed to cleanup old channels:/,
];

const ALLOWED_ERROR_PATTERNS = [
  /Error fetching prayer times:/,
  /\[KeyDiag\] SecureStore FAILED/,
  /\[KeyDiag\] MMKV fallback also FAILED/,
];

let warnMessages = [];
let errorMessages = [];
let warnSpy;
let errorSpy;

function stringifyConsoleArgs(args) {
  return args
    .map((arg) => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      return typeof arg === 'string' ? arg : JSON.stringify(arg);
    })
    .join(' ');
}

beforeEach(() => {
  warnMessages = [];
  errorMessages = [];

  warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
    warnMessages.push(stringifyConsoleArgs(args));
  });

  errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
    errorMessages.push(stringifyConsoleArgs(args));
  });
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();

  const unexpectedWarnings = warnMessages.filter(
    (message) => !ALLOWED_WARN_PATTERNS.some((pattern) => pattern.test(message))
  );
  const unexpectedErrors = errorMessages.filter(
    (message) => !ALLOWED_ERROR_PATTERNS.some((pattern) => pattern.test(message))
  );

  if (unexpectedWarnings.length > 0 || unexpectedErrors.length > 0) {
    const formattedWarnings =
      unexpectedWarnings.length > 0
        ? `Unexpected console.warn output:\n${unexpectedWarnings.join('\n')}`
        : '';
    const formattedErrors =
      unexpectedErrors.length > 0
        ? `Unexpected console.error output:\n${unexpectedErrors.join('\n')}`
        : '';

    throw new Error([formattedWarnings, formattedErrors].filter(Boolean).join('\n\n'));
  }
});
