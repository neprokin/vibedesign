import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { EnhancedFigmaApi } from '../services/enhanced-figma-api';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для получения токена
 */
export interface GetFigmaTokenParams {
  /** Код авторизации */
  code: string;
}

/**
 * Схема параметров для валидации
 */
export const getFigmaTokenSchema = z.object({
  code: z.string().min(1, { message: 'Authorization code is required' }),
});

/**
 * Обработчик инструмента get_figma_token
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getFigmaTokenHandler = async (
  params: GetFigmaTokenParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting Figma token by code');

    // Валидация параметров
    const validationResult = getFigmaTokenSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем API с данными из конфигурации
    const figmaApi = EnhancedFigmaApi.fromConfig();

    // Получаем токен по коду авторизации
    const result = await figmaApi.getTokenByCode(params.code);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: `Failed to get token: ${result.error || 'No token data returned'}`,
      };
    }

    // Возвращаем токен с замаскированными секретными частями
    const token = result.data;
    const maskedToken = {
      ...token,
      accessToken: token.accessToken ? 
        `${token.accessToken.substring(0, 5)}...${token.accessToken.substring(token.accessToken.length - 5)}` : 
        'invalid-token',
      refreshToken: token.refreshToken ? 
        `${token.refreshToken.substring(0, 5)}...${token.refreshToken.substring(token.refreshToken.length - 5)}` : 
        undefined,
    };
    
    return {
      success: true,
      data: {
        tokenInfo: maskedToken,
        isValid: figmaApi.isTokenValid(),
        meta: {
          expiresAt: token.expiresIn && token.createdAt 
            ? new Date(token.createdAt + token.expiresIn * 1000).toISOString() 
            : 'never',
        },
      },
    };
  } catch (error) {
    logger.error('Error getting Figma token', error);
    return {
      success: false,
      error: `Failed to get Figma token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента get_figma_token
 */
export const getFigmaTokenDescription = {
  name: 'get_figma_token',
  description: 'Gets a Figma OAuth token using an authorization code.',
  parameterSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'The authorization code from the OAuth callback',
      },
    },
    required: ['code'],
  },
  handler: getFigmaTokenHandler,
}; 