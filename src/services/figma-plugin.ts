import { WebSocketClient, WebSocketMessage } from './websocket-client';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

/**
 * Типы сообщений, которые можно отправлять плагину
 */
export enum FigmaPluginMessageType {
  CREATE_FRAME = 'CREATE_FRAME',
  CREATE_RECTANGLE = 'CREATE_RECTANGLE',
  CREATE_TEXT = 'CREATE_TEXT',
  UPDATE_NODE = 'UPDATE_NODE',
  DELETE_NODE = 'DELETE_NODE',
}

/**
 * Результат операции с плагином
 */
export interface FigmaPluginResult {
  /** Успешно ли выполнена операция */
  success: boolean;
  /** Созданная/обновленная нода (если применимо) */
  node?: any;
  /** Сообщение об ошибке (если применимо) */
  error?: string;
}

/**
 * Класс для работы с плагином Figma через WebSocket
 */
export class FigmaPlugin {
  private wsClient: WebSocketClient;
  private pendingRequests: Map<string, { 
    resolve: (value: FigmaPluginResult | PromiseLike<FigmaPluginResult>) => void;
    reject: (reason?: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  /**
   * Конструктор
   * @param wsUrl - URL для WebSocket соединения
   */
  constructor(wsUrl?: string) {
    // Если URL не указан, берем из конфигурации
    const url = wsUrl || `${config.websocketUrl || 'ws://localhost:8765'}`;
    this.wsClient = new WebSocketClient(url);
    this.wsClient.addMessageHandler(this.handleMessage.bind(this));
  }

  /**
   * Создание фрейма в Figma
   * @param fileKey - Ключ файла
   * @param parentId - ID родительской ноды
   * @param name - Имя фрейма
   * @param width - Ширина фрейма
   * @param height - Высота фрейма
   * @param x - Координата X (опционально)
   * @param y - Координата Y (опционально)
   * @param properties - Дополнительные свойства (опционально)
   * @returns Результат операции
   */
  public async createFrame(
    fileKey: string,
    parentId: string,
    name: string,
    width: number,
    height: number,
    x?: number,
    y?: number,
    properties?: Record<string, any>
  ): Promise<FigmaPluginResult> {
    return this.sendRequest({
      type: FigmaPluginMessageType.CREATE_FRAME,
      payload: {
        fileKey,
        parentId,
        name,
        width,
        height,
        x: x || 0,
        y: y || 0,
        properties: properties || {},
      },
    });
  }

  /**
   * Создание прямоугольника в Figma
   * @param fileKey - Ключ файла
   * @param parentId - ID родительской ноды
   * @param name - Имя прямоугольника
   * @param width - Ширина прямоугольника
   * @param height - Высота прямоугольника
   * @param x - Координата X (опционально)
   * @param y - Координата Y (опционально)
   * @param fills - Заливка (опционально)
   * @param properties - Дополнительные свойства (опционально)
   * @returns Результат операции
   */
  public async createRectangle(
    fileKey: string,
    parentId: string,
    name: string,
    width: number,
    height: number,
    x?: number,
    y?: number,
    fills?: any[],
    properties?: Record<string, any>
  ): Promise<FigmaPluginResult> {
    return this.sendRequest({
      type: FigmaPluginMessageType.CREATE_RECTANGLE,
      payload: {
        fileKey,
        parentId,
        name,
        width,
        height,
        x: x || 0,
        y: y || 0,
        fills: fills || [],
        properties: properties || {},
      },
    });
  }

  /**
   * Создание текста в Figma
   * @param fileKey - Ключ файла
   * @param parentId - ID родительской ноды
   * @param text - Текст
   * @param name - Имя текстовой ноды (опционально)
   * @param x - Координата X (опционально)
   * @param y - Координата Y (опционально)
   * @param font - Шрифт (опционально)
   * @param fontSize - Размер шрифта (опционально)
   * @param color - Цвет текста (опционально)
   * @param properties - Дополнительные свойства (опционально)
   * @returns Результат операции
   */
  public async createText(
    fileKey: string,
    parentId: string,
    text: string,
    name?: string,
    x?: number,
    y?: number,
    font?: string,
    fontSize?: number,
    color?: { r: number; g: number; b: number },
    properties?: Record<string, any>
  ): Promise<FigmaPluginResult> {
    return this.sendRequest({
      type: FigmaPluginMessageType.CREATE_TEXT,
      payload: {
        fileKey,
        parentId,
        text,
        name: name || text.substring(0, 20), // По умолчанию имя - первые 20 символов текста
        x: x || 0,
        y: y || 0,
        font,
        fontSize,
        color,
        properties: properties || {},
      },
    });
  }

  /**
   * Обновление свойств ноды в Figma
   * @param fileKey - Ключ файла
   * @param nodeId - ID ноды
   * @param properties - Свойства для обновления
   * @returns Результат операции
   */
  public async updateNode(
    fileKey: string,
    nodeId: string,
    properties: Record<string, any>
  ): Promise<FigmaPluginResult> {
    return this.sendRequest({
      type: FigmaPluginMessageType.UPDATE_NODE,
      payload: {
        fileKey,
        nodeId,
        properties,
      },
    });
  }

  /**
   * Удаление ноды в Figma
   * @param fileKey - Ключ файла
   * @param nodeId - ID ноды
   * @returns Результат операции
   */
  public async deleteNode(
    fileKey: string,
    nodeId: string
  ): Promise<FigmaPluginResult> {
    return this.sendRequest({
      type: FigmaPluginMessageType.DELETE_NODE,
      payload: {
        fileKey,
        nodeId,
      },
    });
  }

  /**
   * Отправка запроса к плагину
   * @param message - Сообщение для отправки
   * @returns Promise с результатом операции
   */
  private async sendRequest(message: WebSocketMessage): Promise<FigmaPluginResult> {
    // Генерируем уникальный ID запроса
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const requestMessage = {
      ...message,
      requestId,
    };

    // Подключаемся, если еще не подключены
    try {
      await this.wsClient.connect();
    } catch (error) {
      return {
        success: false,
        error: `Failed to connect to Figma plugin: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Создаем Promise для ожидания ответа
    return new Promise<FigmaPluginResult>((resolve, reject) => {
      // Устанавливаем таймаут для запроса (30 секунд)
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request to Figma plugin timed out'));
        }
      }, 30000);

      // Сохраняем промис и таймаут
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Отправляем запрос
      this.wsClient.send(requestMessage)
        .catch(error => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(error);
        });
    });
  }

  /**
   * Обработка входящего сообщения от плагина
   * @param message - Входящее сообщение
   */
  private handleMessage(message: WebSocketMessage): void {
    // Проверяем, есть ли в сообщении ID запроса
    const requestId = (message as any).requestId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, timeout } = this.pendingRequests.get(requestId)!;
      
      clearTimeout(timeout);
      this.pendingRequests.delete(requestId);

      // Проверяем, есть ли ошибка в ответе
      if (message.type === 'ERROR') {
        resolve({
          success: false,
          error: message.payload.message || 'Unknown error from Figma plugin',
        });
      } else {
        resolve({
          success: true,
          node: message.payload.node,
        });
      }
    }
  }
} 