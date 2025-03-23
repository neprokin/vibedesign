import { 
  FigmaEventType, 
  EventSource, 
  FigmaEvent, 
  createEvent,
  EventMetadata
} from '../types/events';

/**
 * Интерфейс для обработчика событий
 */
export interface EventHandler<T = any> {
  (event: FigmaEvent<T>): void;
}

/**
 * Тип для хранения ожидающих ответа запросов
 */
type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: ReturnType<typeof setTimeout>;
};

/**
 * Сервис для обработки событий и взаимодействия с WebSocket сервером
 */
export class EventService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private debug: boolean = false;
  private sessionId: string = '';
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  
  /**
   * Подключается к WebSocket серверу
   * @param url URL сервера
   * @returns Promise, который разрешается при успешном подключении
   */
  public connect(url: string): Promise<void> {
    this.url = url;
    this.sessionId = this.generateSessionId();
    
    this.log(`Connecting to ${url}, session ID: ${this.sessionId}`);
    
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.log('Already connected');
        resolve();
        return;
      }
      
      try {
        this.ws = new WebSocket(url);
        
        this.ws.onopen = () => {
          this.log('Connected to server');
          this.reconnectAttempts = 0;
          
          // Отправляем событие подключения с информацией о клиенте
          const clientInfo = this.getClientInfo();
          
          this.sendEventInternal({
            type: FigmaEventType.CONNECT,
            metadata: this.createMetadata(),
            payload: { clientInfo }
          });
          
          // Регистрируем обработчики для системных событий
          this.registerEventHandler(FigmaEventType.PONG, this.handlePong.bind(this));
          
          // Регистрируем обработчики для событий обновления узлов
          this.registerEventHandler(FigmaEventType.UPDATE_NODE_COMPLETE, this.handleNodeUpdateComplete.bind(this));
          this.registerEventHandler(FigmaEventType.UPDATE_NODE_ERROR, this.handleNodeUpdateError.bind(this));
          
          // Регистрируем обработчики для событий генерации кода
          this.registerEventHandler(FigmaEventType.GENERATE_CODE_PROGRESS, this.handleCodeGenerationProgress.bind(this));
          this.registerEventHandler(FigmaEventType.GENERATE_CODE_COMPLETE, this.handleCodeGenerationComplete.bind(this));
          
          // Запускаем периодическую отправку PING
          this.startPingInterval();
          
          resolve();
        };
        
        this.ws.onclose = (event) => {
          this.log(`WebSocket closed: ${event.code} ${event.reason}`);
          this.cleanup();
          
          // Создаем событие отключения
          const disconnectEvent: FigmaEvent<any> = {
            type: FigmaEventType.DISCONNECT,
            metadata: this.createMetadata(),
            payload: { 
              code: event.code,
              reason: event.reason || 'Connection closed',
              wasClean: event.wasClean
            }
          };
          
          // Уведомляем обработчики о отключении
          this.notifyHandlers(disconnectEvent);
          
          // Пытаемся переподключиться, если соединение было закрыто не нами
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
            this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
              this.connect(this.url).catch(err => {
                this.logError('Reconnect failed:', err);
              });
            }, delay);
          }
        };
        
        this.ws.onerror = (error) => {
          this.logError('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onmessage = (message) => {
          try {
            const event = JSON.parse(message.data) as FigmaEvent<any>;
            this.log('Received event:', event);
            
            this.handleEvent(event);
          } catch (error) {
            this.logError('Error handling message:', error, message.data);
          }
        };
      } catch (error) {
        this.logError('Error connecting to WebSocket:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Отключается от WebSocket сервера
   */
  public disconnect(): void {
    this.log('Disconnecting from server');
    
    if (this.ws) {
      // Если соединение открыто, отправляем событие DISCONNECT
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendEventInternal({
          type: FigmaEventType.DISCONNECT,
          metadata: this.createMetadata(),
          payload: { reason: 'Client disconnected' }
        });
      }
      
      // Отменяем обработчики событий WebSocket
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      
      // Закрываем соединение
      this.ws.close();
      this.ws = null;
    }
    
    // Очищаем таймер пинга
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Отклоняем все ожидающие запросы
    this.rejectAllPendingRequests('WebSocket connection closed');
  }
  
  /**
   * Проверяет, активно ли соединение с сервером
   * @returns true, если соединение активно
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Отправляет событие без ожидания ответа
   * @param type Тип события
   * @param payload Полезная нагрузка события
   */
  public sendEvent(type: FigmaEventType, payload?: any): void {
    const event: FigmaEvent<any> = {
      type,
      metadata: this.createMetadata(),
      payload
    };
    
    this.sendEventInternal(event);
  }
  
  /**
   * Отправляет событие и ожидает ответа с соответствующим correlation_id
   * @param type Тип события
   * @param payload Полезная нагрузка события
   * @param timeout Время ожидания ответа в миллисекундах
   * @returns Promise, который разрешается при получении ответа
   */
  public sendEventAndWaitForResponse<T = any, R = any>(
    type: FigmaEventType, 
    payload?: T, 
    timeout: number = 30000
  ): Promise<FigmaEvent<R>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }
      
      // Создаем событие с уникальным correlation_id
      const correlationId = crypto.randomUUID();
      
      const metadata: EventMetadata = {
        event_id: crypto.randomUUID(),
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
        source: EventSource.PLUGIN,
        session_id: this.sessionId
      };
      
      const event: FigmaEvent<T> = {
        type,
        metadata,
        payload
      };
      
      // Устанавливаем таймаут для запроса
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(correlationId)) {
          this.pendingRequests.delete(correlationId);
          reject(new Error(`Request timed out after ${timeout}ms`));
        }
      }, timeout);
      
      // Сохраняем обработчики для промиса
      this.pendingRequests.set(correlationId, {
        resolve,
        reject,
        timeout: timeoutId
      });
      
      // Отправляем событие
      this.sendEventInternal(event);
    });
  }
  
  /**
   * Отправляет запрос на обновление узла
   * @param nodeId ID узла
   * @param properties Свойства для обновления
   * @returns Promise, который разрешается при завершении обновления
   */
  public updateNode(nodeId: string, properties: any): Promise<any> {
    return this.sendEventAndWaitForResponse(
      FigmaEventType.UPDATE_NODE_REQUEST,
      { nodeId, properties }
    );
  }
  
  /**
   * Регистрирует обработчик для определенного типа события
   * @deprecated Используйте registerEventHandler вместо этого
   */
  public on<T>(eventType: FigmaEventType, handler: EventHandler<T>): void {
    this.registerEventHandler(eventType, handler);
  }
  
  /**
   * Удаляет обработчик для определенного типа события
   * @deprecated Используйте unregisterEventHandler вместо этого
   */
  public off<T>(eventType: FigmaEventType, handler: EventHandler<T>): void {
    this.unregisterEventHandler(eventType, handler);
  }
  
  /**
   * Регистрирует обработчик для определенного типа события
   * @param eventType Тип события
   * @param handler Функция-обработчик
   */
  public registerEventHandler<T>(eventType: FigmaEventType, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    this.handlers.get(eventType)!.add(handler as EventHandler);
    this.log(`Registered handler for ${eventType}`);
  }
  
  /**
   * Удаляет обработчик для определенного типа события
   * @param eventType Тип события
   * @param handler Функция-обработчик
   */
  public unregisterEventHandler<T>(eventType: FigmaEventType, handler: EventHandler<T>): void {
    if (this.handlers.has(eventType)) {
      this.handlers.get(eventType)!.delete(handler as EventHandler);
      this.log(`Unregistered handler for ${eventType}`);
    }
  }
  
  /**
   * Включает или отключает режим отладки
   * @param debug Флаг режима отладки
   */
  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
  
  /**
   * Отправляет событие на сервер
   */
  private sendEventInternal(event: FigmaEvent<any>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logError('Cannot send event: WebSocket is not connected');
      return;
    }
    
    try {
      this.log('Sending event:', event);
      this.ws.send(JSON.stringify(event));
      
      // Уведомляем обработчиков о отправленном событии
      // но только если это не служебные события (PING, PONG)
      if (event.type !== FigmaEventType.PING && event.type !== FigmaEventType.PONG) {
        this.notifyHandlers(event);
      }
    } catch (error) {
      this.logError('Error sending event:', error);
    }
  }
  
  /**
   * Создает метаданные события
   */
  private createMetadata(): EventMetadata {
    return {
      event_id: crypto.randomUUID(),
      correlation_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: EventSource.PLUGIN,
      session_id: this.sessionId
    };
  }
  
  /**
   * Обрабатывает входящее событие
   * @param event Событие для обработки
   */
  private handleEvent(event: FigmaEvent<any>): void {
    // Проверяем, есть ли ожидающий запрос с таким correlation_id
    if (event.metadata.correlation_id && this.pendingRequests.has(event.metadata.correlation_id)) {
      const { resolve, timeout } = this.pendingRequests.get(event.metadata.correlation_id)!;
      
      clearTimeout(timeout);
      this.pendingRequests.delete(event.metadata.correlation_id);
      
      resolve(event);
      return;
    }
    
    // Иначе уведомляем всех обработчиков этого типа события
    this.notifyHandlers(event);
  }
  
  /**
   * Уведомляет всех обработчиков о событии
   * @param event Событие для обработки
   */
  private notifyHandlers(event: FigmaEvent<any>): void {
    if (this.handlers.has(event.type)) {
      const handlers = this.handlers.get(event.type)!;
      
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          this.logError(`Error in handler for ${event.type}:`, error);
        }
      }
    }
  }
  
  /**
   * Отклоняет все ожидающие запросы с ошибкой
   * @param reason Причина отклонения
   */
  private rejectAllPendingRequests(reason: string): void {
    for (const [correlationId, { reject, timeout }] of this.pendingRequests.entries()) {
      clearTimeout(timeout);
      reject(new Error(reason));
      this.pendingRequests.delete(correlationId);
    }
  }
  
  /**
   * Очищает ресурсы сервиса
   */
  private cleanup(): void {
    this.stopPingInterval();
  }
  
  /**
   * Запускает интервал отправки PING
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendEvent(FigmaEventType.PING, { time: new Date().toISOString() });
      }
    }, 30000); // Ping каждые 30 секунд
  }
  
  /**
   * Останавливает интервал отправки PING
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Создаёт идентификатор сессии
   */
  private generateSessionId(): string {
    // Простая функция генерации псевдо-UUID
    const s4 = () => 
      Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
        
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }
  
  /**
   * Получает информацию о клиенте
   */
  private getClientInfo(): Record<string, string> {
    return {
      pluginId: '1234567890', // ID плагина в Figma
      platform: 'Figma',      // Платформа
      version: '1.0.0'        // Версия плагина
    };
  }
  
  /**
   * Выводит сообщение в консоль, если включен режим отладки
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[EventService]', ...args);
    }
  }
  
  /**
   * Выводит сообщение об ошибке в консоль
   */
  private logError(...args: any[]): void {
    if (this.debug) {
      console.error('[EventService]', ...args);
    }
  }
  
  /**
   * Обработчик события GENERATE_CODE_PROGRESS
   * @param event Событие прогресса генерации кода
   * @private
   */
  private handleCodeGenerationProgress(event: FigmaEvent<any>): void {
    this.log(`Code generation progress: ${JSON.stringify(event.payload)}`);
    // Просто ретранслируем событие слушателям
    this.notifyHandlers(event);
  }
  
  /**
   * Обработчик события GENERATE_CODE_COMPLETE
   * @param event Событие завершения генерации кода
   * @private
   */
  private handleCodeGenerationComplete(event: FigmaEvent<any>): void {
    this.log(`Code generation complete: ${JSON.stringify(event.payload)}`);
    
    // Ищем и разрешаем соответствующий запрос
    const correlationId = event.metadata.correlation_id;
    if (this.pendingRequests.has(correlationId)) {
      const request = this.pendingRequests.get(correlationId);
      if (request) {
        clearTimeout(request.timeout);
        request.resolve(event);
        this.pendingRequests.delete(correlationId);
      }
    }
    
    // Уведомляем слушателей о получении ответа
    this.notifyHandlers(event);
  }
  
  /**
   * Обработчик события PONG
   * @param event Событие PONG
   * @private
   */
  private handlePong(event: FigmaEvent<any>): void {
    this.log(`PONG received: ${JSON.stringify(event.payload)}`);
    
    // Ищем и разрешаем соответствующий запрос
    const correlationId = event.metadata.correlation_id;
    if (this.pendingRequests.has(correlationId)) {
      const request = this.pendingRequests.get(correlationId);
      if (request) {
        clearTimeout(request.timeout);
        request.resolve(event);
        this.pendingRequests.delete(correlationId);
      }
    }
    
    // Уведомляем слушателей о получении ответа
    this.notifyHandlers(event);
  }
  
  /**
   * Обработчик события UPDATE_NODE_COMPLETE
   * @param event Событие завершения обновления узла
   * @private
   */
  private handleNodeUpdateComplete(event: FigmaEvent<any>): void {
    this.log(`Node update complete: ${JSON.stringify(event.payload)}`);
    
    // Ищем и разрешаем соответствующий запрос
    const correlationId = event.metadata.correlation_id;
    if (this.pendingRequests.has(correlationId)) {
      const request = this.pendingRequests.get(correlationId);
      if (request) {
        clearTimeout(request.timeout);
        request.resolve(event);
        this.pendingRequests.delete(correlationId);
      }
    }
    
    // Уведомляем слушателей о получении ответа
    this.notifyHandlers(event);
  }
  
  /**
   * Обработчик события UPDATE_NODE_ERROR
   * @param event Событие ошибки обновления узла
   * @private
   */
  private handleNodeUpdateError(event: FigmaEvent<any>): void {
    this.log(`Node update error: ${JSON.stringify(event.payload)}`);
    
    // Ищем и отклоняем соответствующий запрос
    const correlationId = event.metadata.correlation_id;
    if (this.pendingRequests.has(correlationId)) {
      const request = this.pendingRequests.get(correlationId);
      if (request) {
        clearTimeout(request.timeout);
        request.reject(new Error(`Node update error: ${JSON.stringify(event.payload)}`));
        this.pendingRequests.delete(correlationId);
      }
    }
    
    // Уведомляем слушателей о получении ошибки
    this.notifyHandlers(event);
  }
} 