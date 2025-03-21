import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { EnhancedFigmaApi, CacheOptions } from '../services/enhanced-figma-api';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для получения данных с кэшированием
 */
export interface GetCachedFigmaDataParams {
  /** Ключ файла Figma */
  fileKey: string;
  /** ID ноды (опционально) */
  nodeId?: string;
  /** Массив ID нод (опционально) */
  nodeIds?: string[];
  /** Время жизни кэша в секундах (опционально) */
  cacheTTL?: number;
  /** Проверять актуальность кэша (опционально) */
  checkFreshness?: boolean;
  /** Принудительно обновить кэш (опционально) */
  forceRefresh?: boolean;
}

/**
 * Схема параметров для валидации
 */
export const getCachedFigmaDataSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  nodeId: z.string().optional(),
  nodeIds: z.array(z.string()).optional(),
  cacheTTL: z.number().positive().optional(),
  checkFreshness: z.boolean().optional(),
  forceRefresh: z.boolean().optional(),
}).refine(data => !(data.nodeId && data.nodeIds), {
  message: "Cannot specify both nodeId and nodeIds",
  path: ["nodeIds"],
});

/**
 * Обработчик инструмента get_cached_figma_data
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getCachedFigmaDataHandler = async (
  params: GetCachedFigmaDataParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting cached Figma data', {
      fileKey: params.fileKey,
      nodeId: params.nodeId,
      nodeIdsCount: params.nodeIds?.length,
    });

    // Валидация параметров
    const validationResult = getCachedFigmaDataSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем API с данными из конфигурации
    const figmaApi = EnhancedFigmaApi.fromConfig();

    // Настройки кэширования
    const cacheOptions: CacheOptions = {
      ttl: params.cacheTTL || 300,
      checkFreshness: params.checkFreshness || false,
    };

    // Если нужно принудительно обновить кэш, очищаем его
    if (params.forceRefresh) {
      if (params.nodeId) {
        figmaApi.clearCache(undefined, `/files/${params.fileKey}/nodes?ids=${params.nodeId}`);
      } else if (params.nodeIds && params.nodeIds.length > 0) {
        figmaApi.clearCache(undefined, `/files/${params.fileKey}/nodes?ids=${params.nodeIds.join(',')}`);
      } else {
        figmaApi.clearCache(undefined, `/files/${params.fileKey}`);
      }
    }

    // Получаем данные из Figma API с кэшированием
    let result: ToolResult<any>;
    if (params.nodeId) {
      result = await figmaApi.getFileNodes(params.fileKey, [params.nodeId], cacheOptions);
    } else if (params.nodeIds && params.nodeIds.length > 0) {
      result = await figmaApi.getFileNodes(params.fileKey, params.nodeIds, cacheOptions);
    } else {
      result = await figmaApi.getFile(params.fileKey, cacheOptions);
    }

    if (!result.success) {
      return {
        success: false,
        error: `Failed to get Figma data: ${result.error}`,
      };
    }

    // Возвращаем результат с информацией о кэшировании
    return {
      success: true,
      data: result.data,
      meta: {
        ...(result.meta || {}),
        fileKey: params.fileKey,
        nodeId: params.nodeId,
        nodeIds: params.nodeIds,
        cacheOptions: {
          ttl: cacheOptions.ttl,
          checkFreshness: cacheOptions.checkFreshness,
          forceRefresh: params.forceRefresh || false,
        },
        cacheStats: figmaApi.getCacheStats(),
      },
    };
  } catch (error) {
    logger.error('Error getting cached Figma data', error);
    return {
      success: false,
      error: `Failed to get cached Figma data: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента get_cached_figma_data
 */
export const getCachedFigmaDataDescription = {
  name: 'get_cached_figma_data',
  description: 'Gets Figma file or node data with caching support.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file',
      },
      nodeId: {
        type: 'string',
        description: 'The ID of a specific node to retrieve (optional)',
      },
      nodeIds: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Array of node IDs to retrieve (optional)',
      },
      cacheTTL: {
        type: 'number',
        description: 'Cache time-to-live in seconds (optional)',
      },
      checkFreshness: {
        type: 'boolean',
        description: 'Whether to check if cached data is still fresh (optional)',
      },
      forceRefresh: {
        type: 'boolean',
        description: 'Whether to force a refresh of the cache (optional)',
      },
    },
    required: ['fileKey'],
  },
  handler: getCachedFigmaDataHandler,
}; 