import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { TokenExportFormat } from '../types/design-tokens';
import { logger } from '../utils/logger';
import { designTokensService } from './get-design-tokens';

/**
 * Интерфейс параметров для экспорта токенов
 */
export interface ExportDesignTokensParams {
  /** ID коллекции */
  collectionId: string;
  /** Формат экспорта */
  format: TokenExportFormat;
}

/**
 * Схема параметров для валидации
 */
export const exportDesignTokensSchema = z.object({
  collectionId: z.string().min(1, { message: 'Collection ID is required' }),
  format: z.nativeEnum(TokenExportFormat),
});

/**
 * Обработчик инструмента export_design_tokens
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const exportDesignTokensHandler = async (
  params: ExportDesignTokensParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Exporting design tokens', { 
      collectionId: params.collectionId,
      format: params.format,
    });

    // Валидация параметров
    const validationResult = exportDesignTokensSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    const { collectionId, format } = params;

    // Проверяем, существует ли коллекция
    const collection = designTokensService.getCollection(collectionId);
    if (!collection) {
      return {
        success: false,
        error: `Collection with ID ${collectionId} not found`,
      };
    }

    try {
      // Экспортируем токены в указанный формат
      const exportedContent = designTokensService.exportTokens(collectionId, format);

      return {
        success: true,
        data: {
          content: exportedContent,
          meta: {
            collectionId,
            collectionName: collection.name,
            format,
            tokenCount: designTokensService.countAllTokens(collectionId),
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to export tokens: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  } catch (error) {
    logger.error('Error exporting design tokens', error);
    return {
      success: false,
      error: `Failed to export design tokens: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента export_design_tokens
 */
export const exportDesignTokensDescription = {
  name: 'export_design_tokens',
  description: 'Exports design tokens from a collection in the specified format.',
  parameterSchema: {
    type: 'object',
    properties: {
      collectionId: {
        type: 'string',
        description: 'The ID of the token collection to export',
      },
      format: {
        type: 'string',
        enum: Object.values(TokenExportFormat),
        description: 'The format to export the tokens in',
      },
    },
    required: ['collectionId', 'format'],
  },
  handler: exportDesignTokensHandler,
}; 