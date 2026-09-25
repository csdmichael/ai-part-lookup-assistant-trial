const SENSITIVE_KEY_PATTERN = /(cost|price|notes|email|phone|secret|token|password|authorization)/i;

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogSink {
  write(level: LogLevel, entry: Record<string, unknown>): void;
}

/** Recursively redacts values whose key suggests sensitive or commercially confidential data. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redact(item, depth + 1)
    ])
  );
}

const consoleSink: LogSink = {
  write(level, entry) {
    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
};

export class Logger {
  constructor(private readonly sink: LogSink = consoleSink) {}

  private log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
    this.sink.write(level, {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(redact(context) as Record<string, unknown>)
    });
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
