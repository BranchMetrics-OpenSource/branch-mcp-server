/**
 * @file This file configures the application's logger using the Winston library.
 * It sets up a JSON-formatted logger that automatically redacts sensitive information
 * (like API keys and secrets) from log messages to prevent accidental exposure.
 */
import winston from 'winston';

/**
 * An array of keys that should be redacted from log output.
 * This is used to prevent sensitive credentials from being written to logs.
 */
const SENSITIVE_KEYS = [
  'branch_secret',
  'branch_key',
  'api_key',
  'auth_token',
  'app_id',
  'organization_id'
];
/**
 * The placeholder string to use when redacting sensitive values.
 */
const REDACTED_PLACEHOLDER = '[REDACTED]';

/**
 * Recursively sanitizes an object by redacting values associated with sensitive keys.
 * It traverses the entire object, including nested objects and arrays, and replaces
 * any value whose key is in the `SENSITIVE_KEYS` list with a placeholder.
 * @param obj The object to sanitize.
 * @returns A new, sanitized object.
 */
export function sanitizeLogObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogObject);
  }

  const newObj: { [key: string]: unknown } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (SENSITIVE_KEYS.includes(key)) {
        newObj[key] = REDACTED_PLACEHOLDER;
      } else {
        newObj[key] = sanitizeLogObject((obj as { [key: string]: unknown })[key]);
      }
    }
  }
  return newObj;
}

/**
 * A custom Winston format that recursively sanitizes the entire log `info` object.
 * It redacts values for keys found in the `SENSITIVE_KEYS` list.
 */
const sanitizerFormat = winston.format((info) => {
  return sanitizeLogObject(info) as winston.Logform.TransformableInfo;
});

/**
 * The main application logger instance, configured with Winston.
 *
 * It includes the following features:
 * - A timestamp for each log entry.
 * - Full error stack traces.
 * - Support for "splat" arguments (e.g., `logger.info('message', { key: 'value' })`).
 * - A custom sanitizer to redact sensitive data.
 * - JSON output format for structured logging.
 * - A console transport to write logs to standard output.
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(), // Important: splat before sanitizer
    sanitizerFormat(), // Custom sanitizer
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

export default logger;
