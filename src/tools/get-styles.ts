import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { FigmaApi } from '../services/figma-api';
import { ToolResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для инструмента get_styles
 */
export interface GetStylesParams {
  /** Ключ файла */
  fileKey: string;
  /** Тип стилей (опционально) */
  styleType?: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

/**
 * Схема параметров для валидации
 */
export const getStylesSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  styleType: z.enum(['FILL', 'TEXT', 'EFFECT', 'GRID']).optional(),
});

/**
 * Обработчик инструмента get_styles
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getStylesHandler = async (
  params: GetStylesParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting Figma styles', { fileKey: params.fileKey, styleType: params.styleType });

    // Валидация параметров
    const validationResult = getStylesSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Получаем Figma API ключ из MCP запроса
    const figmaApiKey = request.env?.FIGMA_API_KEY;
    if (!figmaApiKey) {
      return {
        success: false,
        error: 'Figma API key is not provided in environment variables',
      };
    }

    // Создаем экземпляр Figma API клиента
    const figmaApi = new FigmaApi(figmaApiKey);

    // Получаем стили из файла
    const result = await figmaApi.getFileStyles(params.fileKey);
    if (!result.success) {
      return result;
    }

    // Если указан тип стиля, фильтруем результаты
    let filteredStyles = result.data.styles;
    
    if (params.styleType) {
      filteredStyles = filteredStyles.filter(
        (style: any) => style.style_type === params.styleType
      );
    }

    // Форматируем и возвращаем результат
    return {
      success: true,
      data: {
        styles: filteredStyles.map((style: any) => ({
          id: style.key,
          name: style.name,
          type: style.style_type,
          description: style.description || '',
        })),
        meta: {
          total: filteredStyles.length,
          fileKey: params.fileKey,
          styleType: params.styleType || 'ALL',
        }
      },
    };
  } catch (error) {
    logger.error('Error getting Figma styles', error);
    return {
      success: false,
      error: `Failed to get Figma styles: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента get_styles
 */
export const getStylesDescription = {
  name: 'get_styles',
  description: 'Gets information about styles in a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file to fetch styles from',
      },
      styleType: {
        type: 'string',
        enum: ['FILL', 'TEXT', 'EFFECT', 'GRID'],
        description: 'Optional filter for style types (FILL, TEXT, EFFECT, or GRID)',
      },
    },
    required: ['fileKey'],
  },
  handler: getStylesHandler,
}; 