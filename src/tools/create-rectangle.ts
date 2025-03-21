import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { FigmaPlugin } from '../services/figma-plugin';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для создания прямоугольника
 */
export interface CreateRectangleParams {
  /** Ключ файла */
  fileKey: string;
  /** ID родительской ноды */
  parentId: string;
  /** Имя прямоугольника */
  name: string;
  /** Ширина прямоугольника */
  width: number;
  /** Высота прямоугольника */
  height: number;
  /** Координата X */
  x?: number;
  /** Координата Y */
  y?: number;
  /** Заливка */
  fills?: Array<{
    /** Тип заливки */
    type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
    /** Цвет (для SOLID) */
    color?: { r: number; g: number; b: number; a?: number };
    /** Прозрачность */
    opacity?: number;
    /** Параметры градиента (для градиентных заливок) */
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
    }>;
    /** ID изображения (для IMAGE) */
    imageRef?: string;
  }>;
  /** Дополнительные свойства */
  properties?: Record<string, any>;
}

/**
 * Схема параметров для валидации
 */
export const createRectangleSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  parentId: z.string().min(1, { message: 'Parent node ID is required' }),
  name: z.string().min(1, { message: 'Rectangle name is required' }),
  width: z.number().positive({ message: 'Width must be positive' }),
  height: z.number().positive({ message: 'Height must be positive' }),
  x: z.number().optional(),
  y: z.number().optional(),
  fills: z.array(z.object({
    type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE', 'EMOJI']),
    color: z.object({
      r: z.number().min(0).max(1),
      g: z.number().min(0).max(1),
      b: z.number().min(0).max(1),
      a: z.number().min(0).max(1).optional(),
    }).optional(),
    opacity: z.number().min(0).max(1).optional(),
    gradientStops: z.array(z.object({
      position: z.number().min(0).max(1),
      color: z.object({
        r: z.number().min(0).max(1),
        g: z.number().min(0).max(1),
        b: z.number().min(0).max(1),
        a: z.number().min(0).max(1).optional(),
      }),
    })).optional(),
    imageRef: z.string().optional(),
  })).optional(),
  properties: z.record(z.any()).optional(),
});

/**
 * Обработчик инструмента create_rectangle
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const createRectangleHandler = async (
  params: CreateRectangleParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Creating Figma rectangle', { 
      fileKey: params.fileKey, 
      parentId: params.parentId,
      name: params.name,
      width: params.width,
      height: params.height,
    });

    // Валидация параметров
    const validationResult = createRectangleSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем экземпляр плагина Figma
    const figmaPlugin = new FigmaPlugin();

    // Создаем прямоугольник через плагин
    const result = await figmaPlugin.createRectangle(
      params.fileKey,
      params.parentId,
      params.name,
      params.width,
      params.height,
      params.x,
      params.y,
      params.fills,
      params.properties
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create rectangle in Figma',
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
          operation: 'CREATE_RECTANGLE',
        },
      },
    };
  } catch (error) {
    logger.error('Error creating Figma rectangle', error);
    return {
      success: false,
      error: `Failed to create Figma rectangle: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента create_rectangle
 */
export const createRectangleDescription = {
  name: 'create_rectangle',
  description: 'Creates a new rectangle in a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file to create the rectangle in',
      },
      parentId: {
        type: 'string',
        description: 'The ID of the parent node where the rectangle will be created',
      },
      name: {
        type: 'string',
        description: 'The name of the new rectangle',
      },
      width: {
        type: 'number',
        description: 'The width of the rectangle in pixels',
      },
      height: {
        type: 'number',
        description: 'The height of the rectangle in pixels',
      },
      x: {
        type: 'number',
        description: 'The x position of the rectangle (optional)',
      },
      y: {
        type: 'number',
        description: 'The y position of the rectangle (optional)',
      },
      fills: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE', 'EMOJI'],
              description: 'The type of fill',
            },
            color: {
              type: 'object',
              properties: {
                r: { type: 'number', description: 'Red component (0-1)' },
                g: { type: 'number', description: 'Green component (0-1)' },
                b: { type: 'number', description: 'Blue component (0-1)' },
                a: { type: 'number', description: 'Alpha component (0-1)' },
              },
              description: 'The color for SOLID fills',
            },
            opacity: {
              type: 'number',
              description: 'The opacity of the fill (0-1)',
            },
          },
        },
        description: 'Fill styles for the rectangle (optional)',
      },
      properties: {
        type: 'object',
        description: 'Additional properties for the rectangle (optional)',
      },
    },
    required: ['fileKey', 'parentId', 'name', 'width', 'height'],
  },
  handler: createRectangleHandler,
}; 