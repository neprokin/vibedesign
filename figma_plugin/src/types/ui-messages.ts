import { FigmaEvent } from './events';

/**
 * Типы сообщений для обмена между UI и кодом плагина
 */

// Базовый интерфейс для всех сообщений
export interface UIMessage {
  type: string;
  [key: string]: any;
}

// Подключение к серверу
export interface ConnectMessage extends UIMessage {
  type: 'CONNECT';
  serverUrl: string;
}

// Статус подключения
export interface ConnectionStatusMessage extends UIMessage {
  type: 'CONNECTION_STATUS';
  connected: boolean;
  serverUrl?: string;
}

// Запрос на получение выделения
export interface GetSelectionMessage extends UIMessage {
  type: 'GET_SELECTION';
}

// Информация о выделении
export interface SelectionInfoMessage extends UIMessage {
  type: 'SELECTION_INFO';
  selection: Array<{
    id: string;
    name: string;
    type: string;
    visible: boolean;
    locked: boolean;
  }>;
  count: number;
  hasSelection: boolean;
}

// Обновление узла
export interface UpdateNodeMessage extends UIMessage {
  type: 'UPDATE_NODE';
  nodeId: string;
  properties: Record<string, any>;
}

// Результат обновления узла
export interface NodeUpdatedMessage extends UIMessage {
  type: 'NODE_UPDATED';
  nodeId: string;
  success: boolean;
  error?: string;
}

// Ошибка обновления
export interface UpdateErrorMessage extends UIMessage {
  type: 'UPDATE_ERROR';
  nodeId: string;
  error: string;
}

// Общая ошибка
export interface ErrorMessage extends UIMessage {
  type: 'ERROR';
  message: string;
  code?: number;
}

// Загрузка UI
export interface UILoadedMessage extends UIMessage {
  type: 'UI_LOADED';
}

// Запись лога
export interface LogEntryMessage extends UIMessage {
  type: 'LOG_ENTRY';
  logEntry: {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  };
}

// Запрос на экспорт логов
export interface ExportLogsMessage extends UIMessage {
  type: 'EXPORT_LOGS';
}

// Данные экспорта логов
export interface LogsExportDataMessage extends UIMessage {
  type: 'LOGS_EXPORT_DATA';
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
}

// Очистка логов
export interface ClearLogsMessage extends UIMessage {
  type: 'CLEAR_LOGS';
}

// Логи очищены
export interface LogsClearedMessage extends UIMessage {
  type: 'LOGS_CLEARED';
}

// Изменение статуса соединения
export interface ConnectionChangedMessage extends UIMessage {
  type: 'CONNECTION_CHANGED';
  connected: boolean;
  serverUrl?: string;
}

// Сообщение от сервера
export interface ServerMessageMessage extends UIMessage {
  type: 'SERVER_MESSAGE';
  event: FigmaEvent;
}

// Ответ от сервера
export interface ServerResponseMessage extends UIMessage {
  type: 'SERVER_RESPONSE';
  event: FigmaEvent;
}

// Запрос на анализ дизайна
export interface RequestAnalyzeDesignMessage extends UIMessage {
  type: 'ANALYZE_DESIGN';
}

// Запрос на генерацию кода
export interface RequestGenerateCodeMessage extends UIMessage {
  type: 'GENERATE_CODE';
}

// Запрос на генерацию адаптивного макета
export interface RequestGenerateResponsiveMessage extends UIMessage {
  type: 'GENERATE_RESPONSIVE';
}

// Запрос на генерацию вариантов
export interface RequestGenerateVariantsMessage extends UIMessage {
  type: 'GENERATE_VARIANTS';
}

// Данные о выделении
export interface SelectionDataMessage extends UIMessage {
  type: 'SELECTION_CHANGED';
  selection: Array<{
    id: string;
    name: string;
    type: string;
    visible: boolean;
    locked: boolean;
  }>;
  count: number;
  hasSelection: boolean;
}

// Обновление настроек
export interface UpdateSettingsMessage extends UIMessage {
  type: 'UPDATE_SETTINGS';
  settings: Record<string, any>;
}

// Настройки обновлены
export interface SettingsUpdatedMessage extends UIMessage {
  type: 'SETTINGS_UPDATED';
  settings: Record<string, any>;
}

// Запрос на получение настроек
export interface GetSettingsMessage extends UIMessage {
  type: 'GET_SETTINGS';
}

// Настройки
export interface SettingsMessage extends UIMessage {
  type: 'SETTINGS';
  settings: Record<string, any>;
}

// Ошибка соединения
export interface ConnectionErrorMessage extends UIMessage {
  type: 'CONNECTION_ERROR';
  error: string;
} 