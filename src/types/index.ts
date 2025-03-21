/**
 * Типы для работы с MCP сервером
 */

/**
 * Опции для MCP сервера
 */
export interface MCPServerOptions {
  /** Порт для HTTP сервера */
  port?: number;
  /** Режим работы (http или stdio) */
  mode?: 'http' | 'stdio';
  /** Токен доступа к Figma API */
  figmaApiKey?: string;
  /** Включить детальное логирование */
  verbose?: boolean;
}

/**
 * Типы для работы с Figma API
 */

/**
 * Информация о файле
 */
export interface FigmaFileInfo {
  /** Ключ файла */
  key: string;
  /** ID ноды (опционально) */
  nodeId?: string;
  /** Глубина обхода дерева (опционально) */
  depth?: number;
}

/**
 * Информация о ноде
 */
export interface FigmaNodeInfo {
  /** ID ноды */
  id: string;
  /** Имя ноды */
  name: string;
  /** Тип ноды */
  type: string;
  /** Родительская нода */
  parent?: FigmaNodeInfo;
  /** Дочерние ноды */
  children?: FigmaNodeInfo[];
  /** Свойства ноды */
  properties?: Record<string, any>;
}

/**
 * Типы для работы с дизайн-токенами
 */
export interface DesignToken {
  /** Имя токена */
  name: string;
  /** Значение токена */
  value: string | number | Record<string, any>;
  /** Тип токена (color, spacing, typography и т.д.) */
  type: string;
  /** Описание токена */
  description?: string;
}

/**
 * Типы для инструментов MCP
 */

/**
 * Параметры для get_figma_data
 */
export interface GetFigmaDataParams {
  /** Ключ файла */
  fileKey: string;
  /** ID ноды (опционально) */
  nodeId?: string;
  /** Глубина обхода дерева (опционально) */
  depth?: number;
}

/**
 * Параметры для get_styles
 */
export interface GetStylesParams {
  /** Ключ файла */
  fileKey: string;
  /** Тип стилей (опционально) */
  styleType?: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

/**
 * Параметры для get_components
 */
export interface GetComponentsParams {
  /** Ключ файла */
  fileKey: string;
  /** ID компонента (опционально) */
  componentId?: string;
}

/**
 * Параметры для get_document_info
 */
export interface GetDocumentInfoParams {
  /** Ключ файла */
  fileKey: string;
}

/**
 * Параметры для get_selection
 */
export interface GetSelectionParams {
  /** Ключ файла */
  fileKey: string;
  /** ID выбранных нод */
  nodeIds: string[];
  /** Глубина обхода дерева (опционально) */
  depth?: number;
}

/**
 * Параметры для create_frame
 */
export interface CreateFrameParams {
  /** Ключ файла */
  fileKey: string;
  /** ID родительской ноды */
  parentId: string;
  /** Имя фрейма */
  name: string;
  /** Ширина фрейма */
  width: number;
  /** Высота фрейма */
  height: number;
  /** Координата X */
  x?: number;
  /** Координата Y */
  y?: number;
  /** Дополнительные свойства */
  properties?: Record<string, any>;
}

/**
 * Параметры для create_text
 */
export interface CreateTextParams {
  /** Ключ файла */
  fileKey: string;
  /** ID родительской ноды */
  parentId: string;
  /** Текст */
  text: string;
  /** Имя ноды */
  name?: string;
  /** Координата X */
  x?: number;
  /** Координата Y */
  y?: number;
  /** Шрифт */
  font?: string;
  /** Размер шрифта */
  fontSize?: number;
  /** Цвет текста */
  color?: { r: number; g: number; b: number };
  /** Дополнительные свойства */
  properties?: Record<string, any>;
}

/**
 * Результат выполнения инструмента
 */
export interface ToolResult<T = any> {
  /** Успешно ли выполнен инструмент */
  success: boolean;
  /** Данные */
  data?: T;
  /** Сообщение об ошибке */
  error?: string;
} 