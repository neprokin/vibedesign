import { FigmaEvent, FigmaEventType, UpdateNodeCompletePayload } from '../types/events';

export interface EventService {
  /**
   * Устанавливает соединение с сервером
   */
  connect(): Promise<void>;
  
  /**
   * Закрывает соединение
   */
  disconnect(): void;
  
  /**
   * Отправляет событие на сервер
   */
  sendEvent<T>(event: FigmaEvent<T>): void;
  
  /**
   * Отправляет событие и ждет ответа
   */
  sendEventAndWaitForResponse<T, R>(
    event: FigmaEvent<T>,
    expectedEventType: FigmaEventType,
    timeoutMs?: number
  ): Promise<FigmaEvent<R>>;
  
  /**
   * Обновляет свойства узла Figma
   */
  updateNode(
    nodeId: string, 
    properties: Record<string, any>
  ): Promise<UpdateNodeCompletePayload>;
  
  /**
   * Добавляет обработчик события
   * @deprecated Используйте registerEventHandler вместо этого метода
   */
  on<T>(
    eventType: FigmaEventType, 
    handler: (event: FigmaEvent<T>) => void | Promise<void>
  ): void;
  
  /**
   * Удаляет обработчик события
   * @deprecated Используйте unregisterEventHandler вместо этого метода
   */
  off<T>(
    eventType: FigmaEventType, 
    handler: (event: FigmaEvent<T>) => void | Promise<void>
  ): void;
  
  /**
   * Регистрирует обработчик события
   */
  registerEventHandler<T>(
    eventType: FigmaEventType, 
    handler: (event: FigmaEvent<T>) => void | Promise<void>
  ): void;
  
  /**
   * Удаляет обработчик события
   */
  unregisterEventHandler<T>(
    eventType: FigmaEventType, 
    handler: (event: FigmaEvent<T>) => void | Promise<void>
  ): void;
  
  /**
   * Включение режима отладки
   */
  setDebug(debug: boolean): void;
} 