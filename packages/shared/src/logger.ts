export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private minLevel: LogLevel;
  private prefix: string;

  constructor(prefix: string, minLevel: LogLevel = "info") {
    this.prefix = prefix;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.minLevel];
  }

  private format(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const ts = new Date().toISOString();
    const base = `[${ts}] [${level.toUpperCase()}] [${this.prefix}] ${message}`;
    return context ? `${base} ${JSON.stringify(context)}` : base;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) console.debug(this.format("debug", message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("info")) console.info(this.format("info", message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) console.warn(this.format("warn", message, context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("error")) console.error(this.format("error", message, context));
  }

  child(childPrefix: string): Logger {
    return new Logger(`${this.prefix}:${childPrefix}`, this.minLevel);
  }
}

export const createLogger = (prefix: string, level?: LogLevel): Logger =>
  new Logger(prefix, level ?? (process.env["LOG_LEVEL"] as LogLevel | undefined) ?? "info");
