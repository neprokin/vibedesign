/**
 * Уровни логирования
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Опции логгера
 */
export interface LoggerOptions {
  /** Минимальный уровень логирования */
  level?: LogLevel;
  /** Префикс для сообщений */
  prefix?: string;
  /** Вывод в консоль */
  console?: boolean;
  /** Callback для кастомного логирования */
  customHandler?: (level: LogLevel, message: string, data?: any) => void;
}

/**
 * Класс для логирования
 */
export class Logger {
  /** Уровень логирования */
  public level: LogLevel;
  private prefix: string;
  private console: boolean;
  private customHandler?: (level: LogLevel, message: string, data?: any) => void;

  /**
   * Конструктор
   * @param options - Опции логгера
   */
  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '[MCP]';
    this.console = options.console ?? true;
    this.customHandler = options.customHandler;
  }

  /**
   * Форматирование времени
   * @returns Отформатированное время
   */
  private getTime(): string {
    const now = new Date();
    return `${now.toISOString()}`;
  }

  /**
   * Логирование сообщения
   * @param level - Уровень логирования
   * @param message - Сообщение
   * @param data - Дополнительные данные
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) return;

    const time = this.getTime();
    const levelName = LogLevel[level];
    const formattedMessage = `${time} ${this.prefix} [${levelName}] ${message}`;

    if (this.console) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, data !== undefined ? data : '');
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, data !== undefined ? data : '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data !== undefined ? data : '');
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, data !== undefined ? data : '');
          break;
      }
    }

    if (this.customHandler) {
      this.customHandler(level, message, data);
    }
  }

  /**
   * Логирование отладочной информации
   * @param message - Сообщение
   * @param data - Дополнительные данные
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Логирование информационного сообщения
   * @param message - Сообщение
   * @param data - Дополнительные данные
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Логирование предупреждения
   * @param message - Сообщение
   * @param data - Дополнительные данные
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Логирование ошибки
   * @param message - Сообщение
   * @param data - Дополнительные данные
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

/**
 * Экспортируем экземпляр логгера для использования во всем приложении
 */
export const logger = new Logger(); 