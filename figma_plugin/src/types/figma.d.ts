/**
 * Расширенные типы для Figma API
 */

declare global {
  interface PluginAPI {
    clientStorage: {
      getAsync: (key: string) => Promise<any>;
      setAsync: (key: string, value: any) => Promise<void>;
    };
    on: (event: string, callback: () => void) => void;
    currentPage: any;
    showUI(html: string, options: ShowUIOptions): void;
    ui: UIAPI;
    getNodeById(id: string): BaseNode | null;
    createRectangle(): RectangleNode;
    createText(): TextNode;
    createFrame(): FrameNode;
    // Добавьте другие методы API по мере необходимости
  }

  interface UIAPI {
    postMessage: (message: any) => void;
    onmessage: (callback: (message: any) => void) => void;
  }

  interface ShowUIOptions {
    width?: number;
    height?: number;
    visible?: boolean;
    themeColors?: boolean;
  }

  // Базовые типы узлов Figma
  interface BaseNode {
    id: string;
    name: string;
    type: string;
    visible: boolean;
    locked: boolean;
    componentData?: any;
    // Другие общие свойства
  }

  interface RectangleNode extends BaseNode {
    type: 'RECTANGLE';
    // Специфичные свойства
  }

  interface TextNode extends BaseNode {
    type: 'TEXT';
    characters: string;
    // Специфичные свойства
  }

  interface FrameNode extends BaseNode {
    type: 'FRAME';
    children: BaseNode[];
    // Специфичные свойства
  }
  
  // Псевдоним для совместимости с кодом
  type FigmaNode = BaseNode;
}

export {}; 