import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { FigmaPlugin } from '../services/figma-plugin';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для создания текста
 */
export interface CreateTextParams {
  /** Ключ файла */
  fileKey: string;
  /** ID родительской ноды */
  parentId: string;
  /** Текст */
  text: string;
  /** Имя текстовой ноды */
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
  color?: { r: number; g: number; b: number; a?: number };
  /** Выравнивание текста */
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  /** Вес шрифта */
  fontWeight?: number;
  /** Дополнительные свойства */
  properties?: Record<string, any>;
}

/**
 * Схема параметров для валидации
 */
export const createTextSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  parentId: z.string().min(1, { message: 'Parent node ID is required' }),
  text: z.string().min(1, { message: 'Text content is required' }),
  name: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  font: z.string().optional(),
  fontSize: z.number().positive({ message: 'Font size must be positive' }).optional(),
  color: z.object({
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1).optional(),
  }).optional(),
  textAlign: z.enum(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']).optional(),
  fontWeight: z.number().optional(),
  properties: z.record(z.any()).optional(),
});

/**
 * Обработчик инструмента create_text
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const createTextHandler = async (
  params: CreateTextParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Creating Figma text', { 
      fileKey: params.fileKey, 
      parentId: params.parentId,
      text: params.text,
      name: params.name || params.text.substring(0, 20),
    });

    // Валидация параметров
    const validationResult = createTextSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем экземпляр плагина Figma
    const figmaPlugin = new FigmaPlugin();

    // Создаем текст через плагин
    const result = await figmaPlugin.createText(
      params.fileKey,
      params.parentId,
      params.text,
      params.name,
      params.x,
      params.y,
      params.font,
      params.fontSize,
      params.color,
      {
        ...(params.textAlign && { textAlign: params.textAlign }),
        ...(params.fontWeight && { fontWeight: params.fontWeight }),
        ...(params.properties || {})
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create text in Figma',
      };
    }

    // Возвращаем результат
    return {
      success: true,
      data: {
        node: result.node,
        meta: {
          fileKey: params.fileKey,
          parentId: params.parentId,
          operation: 'CREATE_TEXT',
        },
      },
    };
  } catch (error) {
    logger.error('Error creating Figma text', error);
    return {
      success: false,
      error: `Failed to create Figma text: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента create_text
 */
export const createTextDescription = {
  name: 'create_text',
  description: 'Creates a new text element in a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file to create the text in',
      },
      parentId: {
        type: 'string',
        description: 'The ID of the parent node where the text will be created',
      },
      text: {
        type: 'string',
        description: 'The content of the text element',
      },
      name: {
        type: 'string',
        description: 'The name of the text node (optional, defaults to first 20 chars of text)',
      },
      x: {
        type: 'number',
        description: 'The x position of the text (optional)',
      },
      y: {
        type: 'number',
        description: 'The y position of the text (optional)',
      },
      font: {
        type: 'string',
        description: 'The font family name (optional)',
      },
      fontSize: {
        type: 'number',
        description: 'The font size in pixels (optional)',
      },
      color: {
        type: 'object',
        properties: {
          r: { type: 'number', description: 'Red component (0-1)' },
          g: { type: 'number', description: 'Green component (0-1)' },
          b: { type: 'number', description: 'Blue component (0-1)' },
          a: { type: 'number', description: 'Alpha component (0-1, optional)' },
        },
        description: 'The color of the text (optional)',
      },
      textAlign: {
        type: 'string',
        enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'],
        description: 'Text alignment (optional)',
      },
      fontWeight: {
        type: 'number',
        description: 'Font weight (e.g., 400 for normal, 700 for bold) (optional)',
      },
      properties: {
        type: 'object',
        description: 'Additional properties for the text (optional)',
      },
    },
    required: ['fileKey', 'parentId', 'text'],
  },
  handler: createTextHandler,
}; 