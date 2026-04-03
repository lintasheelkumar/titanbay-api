import pino from 'pino';
import { injectable } from 'tsyringe';

export interface ILogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

@injectable()
export class PinoLogger implements ILogger {
  private readonly logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    // pino-pretty is only used when explicitly installed and in dev mode
    // Omit transport in test/production to avoid missing-package errors
    ...(process.env.NODE_ENV === 'development' && process.env.LOG_PRETTY === 'true'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(data ?? {}, message);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(data ?? {}, message);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(data ?? {}, message);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(data ?? {}, message);
  }
}
