/**
 * Типы событий, которые могут быть отправлены между плагином и сервером
 */
export enum FigmaEventType {
  // Системные события
  CONNECT = "CONNECT",
  DISCONNECT = "DISCONNECT",
  PING = "PING",
  PONG = "PONG",
  ERROR = "ERROR",
  
  // События обновления узлов
  UPDATE_NODE_REQUEST = "UPDATE_NODE_REQUEST",
  UPDATE_NODE_PROGRESS = "UPDATE_NODE_PROGRESS",
  UPDATE_NODE_COMPLETE = "UPDATE_NODE_COMPLETE",
  UPDATE_NODE_ERROR = "UPDATE_NODE_ERROR",
  
  // События выделения
  SELECTION_CHANGE = "SELECTION_CHANGE",
  GET_SELECTION = "GET_SELECTION",
  
  // События анализа дизайна
  ANALYZE_DESIGN_REQUEST = "ANALYZE_DESIGN_REQUEST",
  ANALYZE_DESIGN_PROGRESS = "ANALYZE_DESIGN_PROGRESS",
  ANALYZE_DESIGN_COMPLETE = "ANALYZE_DESIGN_COMPLETE",
  
  // События генерации кода
  GENERATE_CODE_REQUEST = "GENERATE_CODE_REQUEST",
  GENERATE_CODE_PROGRESS = "GENERATE_CODE_PROGRESS",
  GENERATE_CODE_COMPLETE = "GENERATE_CODE_COMPLETE",
  
  // События адаптивного дизайна
  GENERATE_RESPONSIVE_REQUEST = "GENERATE_RESPONSIVE_REQUEST",
  GENERATE_RESPONSIVE_PROGRESS = "GENERATE_RESPONSIVE_PROGRESS",
  GENERATE_RESPONSIVE_COMPLETE = "GENERATE_RESPONSIVE_COMPLETE"
}

/**
 * Источник события
 */
export enum EventSource {
  PLUGIN = "PLUGIN",
  SERVER = "SERVER"
}

/**
 * Метаданные события
 */
export interface EventMetadata {
  event_id: string;              // Уникальный идентификатор события
  correlation_id: string;        // Идентификатор для связывания запросов и ответов
  timestamp: string;             // Время создания события
  source: EventSource;           // Источник события (плагин или сервер)
  session_id: string;            // Идентификатор сессии
}

/**
 * Базовое событие
 */
export interface FigmaEvent<T = any> {
  type: FigmaEventType;          // Тип события
  metadata: EventMetadata;       // Метаданные события
  payload?: T;                   // Полезная нагрузка события (зависит от типа)
}

/**
 * Полезная нагрузка для запроса обновления узла
 */
export interface UpdateNodeRequestPayload {
  nodeId: string;                // Идентификатор узла в Figma
  properties: Record<string, any>; // Свойства, которые нужно обновить
}

/**
 * Полезная нагрузка для события прогресса обновления узла
 */
export interface UpdateNodeProgressPayload {
  nodeId: string;                // Идентификатор узла в Figma
  status: string;                // Статус обновления
  message?: string;              // Сообщение о статусе
  progress: number;              // Прогресс обновления (от 0 до 1)
}

/**
 * Полезная нагрузка для завершения обновления узла
 */
export interface UpdateNodeCompletePayload {
  nodeId: string;                // Идентификатор узла в Figma
  success: boolean;              // Флаг успешности операции
  changes?: Record<string, any>; // Примененные изменения
}

/**
 * Полезная нагрузка для сообщения об ошибке
 */
export interface ErrorPayload {
  message: string;               // Сообщение об ошибке
  code?: number;                 // Код ошибки
  details?: Record<string, any>; // Дополнительные детали
}

/**
 * Создает новое событие с заданными параметрами
 */
export function createEvent<T = any>(
  type: FigmaEventType,
  payload: T,
  source: 'plugin' | 'server',
  correlationId?: string,
  sessionId?: string
): FigmaEvent<T> {
  return {
    type,
    metadata: {
      event_id: crypto.randomUUID(),
      correlation_id: correlationId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: source === 'plugin' ? EventSource.PLUGIN : EventSource.SERVER,
      session_id: sessionId || 'unknown-session'
    },
    payload
  };
} 