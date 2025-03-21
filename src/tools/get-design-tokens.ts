import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { DesignTokensService } from '../services/design-tokens';
import { TokenType } from '../types/design-tokens';
import { logger } from '../utils/logger';

// Создаем синглтон сервиса токенов
export const designTokensService = new DesignTokensService();

/**
 * Интерфейс параметров для получения токенов
 */
export interface GetDesignTokensParams {
  /** ID коллекции (опционально) */
  collectionId?: string;
  /** Тип токенов (опционально) */
  tokenType?: TokenType;
  /** Имя токена (опционально) */
  tokenName?: string;
}

/**
 * Схема параметров для валидации
 */
export const getDesignTokensSchema = z.object({
  collectionId: z.string().optional(),
  tokenType: z.nativeEnum(TokenType).optional(),
  tokenName: z.string().optional(),
});

/**
 * Обработчик инструмента get_design_tokens
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getDesignTokensHandler = async (
  params: GetDesignTokensParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting design tokens', params);

    // Валидация параметров
    const validationResult = getDesignTokensSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    const { collectionId, tokenType, tokenName } = params;

    // Если указан ID коллекции
    if (collectionId) {
      const collection = designTokensService.getCollection(collectionId);
      
      if (!collection) {
        return {
          success: false,
          error: `Collection with ID ${collectionId} not found`,
        };
      }

      // Если указан тип токена
      if (tokenType) {
        const tokens = designTokensService.getTokensByType(collectionId, tokenType);
        return {
          success: true,
          data: {
            tokens,
            meta: {
              collectionId,
              tokenType,
              count: tokens.length,
            },
          },
        };
      }

      // Если указано имя токена
      if (tokenName) {
        const tokens = designTokensService.getTokensByName(collectionId, tokenName);
        return {
          success: true,
          data: {
            tokens,
            meta: {
              collectionId,
              tokenName,
              count: tokens.length,
            },
          },
        };
      }

      // Если не указаны тип и имя, возвращаем всю коллекцию
      return {
        success: true,
        data: {
          collection,
          meta: {
            collectionId,
            tokenCount: designTokensService.countAllTokens(collectionId),
          },
        },
      };
    }

    // Если ID коллекции не указан, возвращаем все коллекции
    const collections = designTokensService.getAllCollections();
    return {
      success: true,
      data: {
        collections,
        meta: {
          count: collections.length,
        },
      },
    };
  } catch (error) {
    logger.error('Error getting design tokens', error);
    return {
      success: false,
      error: `Failed to get design tokens: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента get_design_tokens
 */
export const getDesignTokensDescription = {
  name: 'get_design_tokens',
  description: 'Gets design tokens from a collection.',
  parameterSchema: {
    type: 'object',
    properties: {
      collectionId: {
        type: 'string',
        description: 'The ID of the token collection (optional)',
      },
      tokenType: {
        type: 'string',
        enum: Object.values(TokenType),
        description: 'The type of tokens to get (optional)',
      },
      tokenName: {
        type: 'string',
        description: 'The name of tokens to get (optional)',
      },
    },
  },
  handler: getDesignTokensHandler,
}; 