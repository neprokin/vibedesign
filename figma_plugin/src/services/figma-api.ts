/**
 * Сервис для взаимодействия с Figma API через плагин
 */

// Типы данных для Figma API
export interface FigmaNodeData {
  id: string;
  name: string;
  type: string;
  children?: FigmaNodeData[];
  [key: string]: any;
}

export interface FigmaSelectionData {
  nodes: FigmaNodeData[];
  activeNode?: FigmaNodeData;
}

// Класс для работы с Figma API
export class FigmaAPIService {
  /**
   * Получение данных о выбранных элементах Figma
   * @returns Promise с данными о выбранных элементах
   */
  static async getSelection(): Promise<FigmaSelectionData> {
    return new Promise((resolve) => {
      // Отправляем сообщение в plugin.ts для получения выбранных элементов
      parent.postMessage({ 
        pluginMessage: { type: 'GET_SELECTION' } 
      }, '*');
      
      // Обработчик ответа
      const handleMessage = (event: MessageEvent) => {
        const message = event.data.pluginMessage;
        if (!message || message.type !== 'SELECTION_DATA') return;
        
        // Удаляем обработчик после получения данных
        window.removeEventListener('message', handleMessage);
        
        // Возвращаем данные
        resolve(message.payload);
      };
      
      // Подписываемся на сообщения
      window.addEventListener('message', handleMessage);
    });
  }
  
  /**
   * Получение данных о конкретном узле по ID
   * @param nodeId ID узла
   * @returns Promise с данными о узле
   */
  static async getNodeById(nodeId: string): Promise<FigmaNodeData | null> {
    return new Promise((resolve) => {
      // Отправляем сообщение в plugin.ts для получения данных узла
      parent.postMessage({ 
        pluginMessage: { 
          type: 'GET_NODE_BY_ID',
          payload: { nodeId }
        } 
      }, '*');
      
      // Обработчик ответа
      const handleMessage = (event: MessageEvent) => {
        const message = event.data.pluginMessage;
        if (!message || message.type !== 'NODE_DATA') return;
        
        // Удаляем обработчик после получения данных
        window.removeEventListener('message', handleMessage);
        
        // Возвращаем данные
        resolve(message.payload || null);
      };
      
      // Подписываемся на сообщения
      window.addEventListener('message', handleMessage);
    });
  }
  
  /**
   * Создание нового фрейма на основе данных
   * @param data Данные для создания фрейма
   * @returns Promise с ID созданного фрейма
   */
  static async createFrame(data: {
    name: string;
    width: number;
    height: number;
    x?: number;
    y?: number;
    fills?: any[];
  }): Promise<string | null> {
    return new Promise((resolve) => {
      // Отправляем сообщение в plugin.ts для создания фрейма
      parent.postMessage({ 
        pluginMessage: { 
          type: 'CREATE_FRAME',
          payload: data
        } 
      }, '*');
      
      // Обработчик ответа
      const handleMessage = (event: MessageEvent) => {
        const message = event.data.pluginMessage;
        if (!message || message.type !== 'FRAME_CREATED') return;
        
        // Удаляем обработчик после получения данных
        window.removeEventListener('message', handleMessage);
        
        // Возвращаем ID созданного фрейма
        resolve(message.payload?.id || null);
      };
      
      // Подписываемся на сообщения
      window.addEventListener('message', handleMessage);
    });
  }
} 