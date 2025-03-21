import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { DesignTokensService } from '../services/design-tokens';
import { logger } from '../utils/logger';

// Используем тот же синглтон сервиса токенов
import { designTokensService } from './get-design-tokens';

/**
 * Интерфейс параметров для создания коллекции токенов
 */
export interface CreateTokenCollectionParams {
  /** Имя коллекции */
  name: string;
  /** Описание коллекции (опционально) */
  description?: string;
  /** Версия коллекции (опционально) */
  version?: string;
  /** JSON-данные для импорта (опционально) */
  importData?: string;
}

/**
 * Схема параметров для валидации
 */
export const createTokenCollectionSchema = z.object({
  name: z.string().min(1, { message: 'Collection name is required' }),
  description: z.string().optional(),
  version: z.string().optional(),
  importData: z.string().optional(),
});

/**
 * Обработчик инструмента create_token_collection
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const createTokenCollectionHandler = async (
  params: CreateTokenCollectionParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Creating token collection', { name: params.name });

    // Валидация параметров
    const validationResult = createTokenCollectionSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    const { name, description, version, importData } = params;

    let collectionId: string;

    // Если указаны данные для импорта, импортируем коллекцию
    if (importData) {
      try {
        collectionId = designTokensService.importFromJSON(importData);
      } catch (importError) {
        return {
          success: false,
          error: `Failed to import token collection: ${importError instanceof Error ? importError.message : String(importError)}`,
        };
      }
    } else {
      // Создаем пустую коллекцию
      collectionId = designTokensService.createCollection(name, description, version);
    }

    // Получаем созданную коллекцию
    const collection = designTokensService.getCollection(collectionId);

    return {
      success: true,
      data: {
        collectionId,
        collection,
        meta: {
          name,
          tokenCount: designTokensService.countAllTokens(collectionId),
        },
      },
    };
  } catch (error) {
    logger.error('Error creating token collection', error);
    return {
      success: false,
      error: `Failed to create token collection: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента create_token_collection
 */
export const createTokenCollectionDescription = {
  name: 'create_token_collection',
  description: 'Creates a new design token collection.',
  parameterSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The name of the token collection',
      },
      description: {
        type: 'string',
        description: 'The description of the token collection (optional)',
      },
      version: {
        type: 'string',
        description: 'The version of the token collection (optional)',
      },
      importData: {
        type: 'string',
        description: 'JSON string with token data to import (optional)',
      },
    },
    required: ['name'],
  },
  handler: createTokenCollectionHandler,
}; 