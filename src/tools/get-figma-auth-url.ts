import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { EnhancedFigmaApi } from '../services/enhanced-figma-api';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для получения URL авторизации
 */
export interface GetFigmaAuthUrlParams {
  /** Массив скоупов доступа */
  scopes: string[];
  /** Состояние для проверки запроса (опционально) */
  state?: string;
}

/**
 * Схема параметров для валидации
 */
export const getFigmaAuthUrlSchema = z.object({
  scopes: z.array(z.string()).min(1, { message: 'At least one scope is required' }),
  state: z.string().optional(),
});

/**
 * Обработчик инструмента get_figma_auth_url
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getFigmaAuthUrlHandler = async (
  params: GetFigmaAuthUrlParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting Figma OAuth URL', { scopes: params.scopes });

    // Валидация параметров
    const validationResult = getFigmaAuthUrlSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем API с данными из конфигурации
    const figmaApi = EnhancedFigmaApi.fromConfig();

    try {
      // Получаем URL для авторизации
      const authUrl = figmaApi.getAuthorizationUrl(params.scopes, params.state);
      
      return {
        success: true,
        data: {
          authorizationUrl: authUrl,
          meta: {
            scopes: params.scopes,
            state: params.state,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get authorization URL: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  } catch (error) {
    logger.error('Error getting Figma OAuth URL', error);
    return {
      success: false,
      error: `Failed to get Figma OAuth URL: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента get_figma_auth_url
 */
export const getFigmaAuthUrlDescription = {
  name: 'get_figma_auth_url',
  description: 'Gets a Figma OAuth authorization URL.',
  parameterSchema: {
    type: 'object',
    properties: {
      scopes: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'The OAuth scopes to request',
      },
      state: {
        type: 'string',
        description: 'Optional state parameter for the OAuth flow',
      },
    },
    required: ['scopes'],
  },
  handler: getFigmaAuthUrlHandler,
}; 