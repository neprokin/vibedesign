import { FigmaEventType } from '../types/events';
import { EventService } from './event-service';

// Типы данных для обновления узлов
type NodeUpdateProgress = {
  nodeId: string;
  status: string;
  message: string;
  progress?: number;
};

type NodeUpdateComplete = {
  nodeId: string;
  success: boolean;
  updatedProperties: string[];
  error?: string;
};

type NodeUpdateError = {
  nodeId: string;
  message: string;
  code?: string;
};

// Функциональная сигнатура для колбэков
type ProgressCallback = (data: NodeUpdateProgress) => void;
type CompleteCallback = (data: NodeUpdateComplete) => void;
type ErrorCallback = (data: NodeUpdateError) => void;

/**
 * Класс для управления обновлением узлов в Figma
 */
export class NodeUpdater {
  private eventService: EventService;
  private isDebug: boolean = false;
  
  // Колбэки для обработки событий обновления
  private progressCallbacks: ProgressCallback[] = [];
  private completeCallbacks: CompleteCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  
  /**
   * Конструктор сервиса обновления узлов
   * @param eventService Сервис событий для коммуникации с сервером
   * @param debug Включить отладочные сообщения
   */
  constructor(eventService: EventService, debug: boolean = false) {
    this.eventService = eventService;
    this.isDebug = debug;
    
    this.registerEventHandlers();
    this.log('Initialized NodeUpdater');
  }
  
  /**
   * Установить режим отладки
   */
  public setDebug(debug: boolean): void {
    this.isDebug = debug;
  }
  
  /**
   * Зарегистрировать обработчики событий
   */
  private registerEventHandlers(): void {
    // Обработчик прогресса обновления
    this.eventService.registerEventHandler(
      FigmaEventType.UPDATE_NODE_PROGRESS,
      (event) => {
        if (typeof event.payload === 'object' && event.payload !== null) {
          const payload = event.payload as any;
          const progress: NodeUpdateProgress = {
            nodeId: payload.nodeId,
            status: payload.status,
            message: payload.message,
            progress: payload.progress
          };
          
          this.log('Update progress:', progress);
          this.progressCallbacks.forEach(callback => callback(progress));
        }
      }
    );
    
    // Обработчик завершения обновления
    this.eventService.registerEventHandler(
      FigmaEventType.UPDATE_NODE_COMPLETE,
      (event) => {
        if (typeof event.payload === 'object' && event.payload !== null) {
          const payload = event.payload as any;
          const complete: NodeUpdateComplete = {
            nodeId: payload.nodeId,
            success: payload.success,
            updatedProperties: payload.updatedProperties || [],
            error: payload.error
          };
          
          this.log('Update complete:', complete);
          this.completeCallbacks.forEach(callback => callback(complete));
        }
      }
    );
    
    // Обработчик ошибки обновления
    this.eventService.registerEventHandler(
      FigmaEventType.ERROR,
      (event) => {
        if (typeof event.payload === 'object' && event.payload !== null) {
          const payload = event.payload as any;
          if (payload.context === 'UPDATE_NODE') {
            const error: NodeUpdateError = {
              nodeId: payload.nodeId,
              message: payload.message,
              code: payload.code
            };
            
            this.error('Update error:', error);
            this.errorCallbacks.forEach(callback => callback(error));
          }
        }
      }
    );
  }
  
  /**
   * Зарегистрировать колбэк для событий прогресса
   */
  public onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }
  
  /**
   * Зарегистрировать колбэк для событий завершения
   */
  public onComplete(callback: CompleteCallback): void {
    this.completeCallbacks.push(callback);
  }
  
  /**
   * Зарегистрировать колбэк для событий ошибки
   */
  public onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
  
  /**
   * Обновить узел
   * @param nodeId ID узла Figma
   * @param properties Свойства для обновления
   * @returns Промис с результатом обновления
   */
  public async updateNode(
    nodeId: string,
    properties: Record<string, any>
  ): Promise<NodeUpdateComplete> {
    this.log('Updating node:', nodeId, 'with properties:', properties);
    
    try {
      // Проверка наличия узла
      const node = figma.getNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      // Отправить запрос на обновление через WebSocket
      const response = await this.eventService.updateNode(nodeId, properties);
      
      // Параллельно применить изменения локально
      this.applyNodeChanges(node as SceneNode, properties);
      
      return {
        nodeId,
        success: true,
        updatedProperties: Object.keys(properties)
      };
    } catch (error) {
      this.error('Error updating node:', error);
      
      const result: NodeUpdateComplete = {
        nodeId,
        success: false,
        updatedProperties: [],
        error: error instanceof Error ? error.message : String(error)
      };
      
      return result;
    }
  }
  
  /**
   * Применить изменения к узлу
   */
  private applyNodeChanges(node: SceneNode, properties: Record<string, any>): void {
    this.log('Applying changes to node:', node.id);
    
    Object.entries(properties).forEach(([key, value]) => {
      this.applySingleProperty(node, key, value);
    });
  }
  
  /**
   * Применить одно свойство к узлу
   */
  private applySingleProperty(node: SceneNode, property: string, value: any): void {
    try {
      switch (property) {
        case 'name':
          node.name = String(value);
          break;
          
        case 'visible':
          node.visible = Boolean(value);
          break;
          
        case 'locked':
          node.locked = Boolean(value);
          break;
          
        case 'opacity':
          if ('opacity' in node) {
            (node as any).opacity = Number(value);
          }
          break;
          
        case 'fill':
          if ('fills' in node) {
            const rgb = this.hexToRgb(value);
            if (rgb) {
              (node as any).fills = [{
                type: 'SOLID',
                color: rgb,
                opacity: 1
              }];
            }
          }
          break;
          
        case 'stroke':
          if ('strokes' in node) {
            const rgb = this.hexToRgb(value);
            if (rgb) {
              (node as any).strokes = [{
                type: 'SOLID',
                color: rgb,
                opacity: 1
              }];
            }
          }
          break;
          
        case 'text':
          if (node.type === 'TEXT' && 'characters' in node) {
            (node as TextNode).characters = String(value);
          }
          break;
          
        case 'width':
          if ('resize' in node) {
            (node as any).resize(Number(value), (node as any).height);
          }
          break;
          
        case 'height':
          if ('resize' in node) {
            (node as any).resize((node as any).width, Number(value));
          }
          break;
          
        case 'x':
          if ('x' in node) {
            (node as any).x = Number(value);
          }
          break;
          
        case 'y':
          if ('y' in node) {
            (node as any).y = Number(value);
          }
          break;
          
        case 'rotation':
          if ('rotation' in node) {
            (node as any).rotation = Number(value);
          }
          break;
          
        default:
          this.log(`Property '${property}' is not supported for direct updates`);
      }
    } catch (error) {
      this.error(`Error applying property ${property}:`, error);
    }
  }
  
  /**
   * Преобразовать HEX-цвет в RGB
   */
  private hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : null;
  }
  
  /**
   * Вывести отладочное сообщение
   */
  private log(...args: any[]): void {
    if (this.isDebug) {
      console.log('[NodeUpdater]', ...args);
    }
  }
  
  /**
   * Вывести сообщение об ошибке
   */
  private error(...args: any[]): void {
    console.error('[NodeUpdater]', ...args);
  }
} 