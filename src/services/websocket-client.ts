import { logger } from '../utils/logger';

/**
 * Интерфейс сообщения для отправки через WebSocket
 */
export interface WebSocketMessage {
  /** Тип сообщения */
  type: string;
  /** Полезная нагрузка сообщения */
  payload: any;
}

/**
 * Интерфейс обработчика сообщений WebSocket
 */
export interface WebSocketMessageHandler {
  (message: WebSocketMessage): void;
}

/**
 * Класс для работы с WebSocket соединением к плагину Figma
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: WebSocketMessageHandler[] = [];
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;
  private resolveConnectionPromise: (() => void) | null = null;
  private rejectConnectionPromise: ((error: Error) => void) | null = null;

  /**
   * Конструктор
   * @param url - URL для WebSocket соединения
   */
  constructor(url: string) {
    this.url = url;
  }

  /**
   * Подключение к WebSocket серверу
   * @returns Promise, который разрешается при успешном подключении
   */
  public async connect(): Promise<void> {
    // Если уже подключены, просто возвращаем успех
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // Если уже идет подключение, возвращаем существующий Promise
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      this.resolveConnectionPromise = resolve;
      this.rejectConnectionPromise = reject;
    });

    try {
      logger.info(`Connecting to WebSocket server: ${this.url}`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      this.isConnecting = false;
      if (this.rejectConnectionPromise) {
        this.rejectConnectionPromise(error instanceof Error ? error : new Error('WebSocket connection error'));
      }
      throw error;
    }

    return this.connectionPromise;
  }

  /**
   * Отправка сообщения через WebSocket
   * @param message - Сообщение для отправки
   */
  public async send(message: WebSocketMessage): Promise<void> {
    // Если не подключены, сначала подключаемся
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    logger.debug('Sending WebSocket message', message);
    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Закрытие WebSocket соединения
   */
  public disconnect(): void {
    if (this.ws) {
      logger.info('Disconnecting from WebSocket server');
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Добавление обработчика сообщений
   * @param handler - Обработчик сообщений
   */
  public addMessageHandler(handler: WebSocketMessageHandler): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Удаление обработчика сообщений
   * @param handler - Обработчик сообщений для удаления
   */
  public removeMessageHandler(handler: WebSocketMessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  /**
   * Обработка события открытия соединения
   */
  private handleOpen(): void {
    logger.info('WebSocket connection established');
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    if (this.resolveConnectionPromise) {
      this.resolveConnectionPromise();
    }
  }

  /**
   * Обработка события закрытия соединения
   */
  private handleClose(event: CloseEvent): void {
    logger.info('WebSocket connection closed', { code: event.code, reason: event.reason });
    this.ws = null;
    this.isConnecting = false;

    // Автоматическое переподключение при неожиданном разрыве
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      logger.info(`Reconnecting, attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay);
    } else if (this.rejectConnectionPromise) {
      this.rejectConnectionPromise(new Error(`WebSocket connection closed: ${event.code} ${event.reason}`));
    }
  }

  /**
   * Обработка события ошибки
   */
  private handleError(event: Event): void {
    logger.error('WebSocket error', event);
    if (this.rejectConnectionPromise) {
      this.rejectConnectionPromise(new Error('WebSocket error'));
    }
  }

  /**
   * Обработка входящего сообщения
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      logger.debug('Received WebSocket message', message);

      // Вызываем все обработчики сообщений
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error('Error in WebSocket message handler', error);
        }
      });
    } catch (error) {
      logger.error('Error parsing WebSocket message', error);
    }
  }
} 