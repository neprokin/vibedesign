import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { CreateFrameParams, ToolResult } from '../types';
import { FigmaPlugin } from '../services/figma-plugin';
import { logger } from '../utils/logger';

/**
 * Схема параметров для валидации
 */
export const createFrameSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  parentId: z.string().min(1, { message: 'Parent node ID is required' }),
  name: z.string().min(1, { message: 'Frame name is required' }),
  width: z.number().positive({ message: 'Width must be positive' }),
  height: z.number().positive({ message: 'Height must be positive' }),
  x: z.number().optional(),
  y: z.number().optional(),
  properties: z.record(z.any()).optional(),
});

/**
 * Обработчик инструмента create_frame
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const createFrameHandler = async (
  params: CreateFrameParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Creating Figma frame', { 
      fileKey: params.fileKey, 
      parentId: params.parentId,
      name: params.name,
      width: params.width,
      height: params.height,
    });

    // Валидация параметров
    const validationResult = createFrameSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем экземпляр плагина Figma
    const figmaPlugin = new FigmaPlugin();

    // Создаем фрейм через плагин
    const result = await figmaPlugin.createFrame(
      params.fileKey,
      params.parentId,
      params.name,
      params.width,
      params.height,
      params.x,
      params.y,
      params.properties
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create frame in Figma',
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
          operation: 'CREATE_FRAME',
        },
      },
    };
  } catch (error) {
    logger.error('Error creating Figma frame', error);
    return {
      success: false,
      error: `Failed to create Figma frame: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента create_frame
 */
export const createFrameDescription = {
  name: 'create_frame',
  description: 'Creates a new frame in a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file to create the frame in',
      },
      parentId: {
        type: 'string',
        description: 'The ID of the parent node where the frame will be created',
      },
      name: {
        type: 'string',
        description: 'The name of the new frame',
      },
      width: {
        type: 'number',
        description: 'The width of the frame in pixels',
      },
      height: {
        type: 'number',
        description: 'The height of the frame in pixels',
      },
      x: {
        type: 'number',
        description: 'The x position of the frame (optional)',
      },
      y: {
        type: 'number',
        description: 'The y position of the frame (optional)',
      },
      properties: {
        type: 'object',
        description: 'Additional properties for the frame (optional)',
      },
    },
    required: ['fileKey', 'parentId', 'name', 'width', 'height'],
  },
  handler: createFrameHandler,
}; 