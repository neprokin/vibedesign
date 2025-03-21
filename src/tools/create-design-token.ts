import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { TokenType, DesignToken } from '../types/design-tokens';
import { logger } from '../utils/logger';
import { designTokensService } from './get-design-tokens';

/**
 * Интерфейс параметров для создания токена
 */
export interface CreateDesignTokenParams {
  /** ID коллекции */
  collectionId: string;
  /** Имя группы */
  groupName: string;
  /** Имя токена */
  name: string;
  /** Тип токена */
  type: TokenType;
  /** Значение токена */
  value: any;
  /** Описание токена (опционально) */
  description?: string;
  /** Метаданные (опционально) */
  meta?: Record<string, any>;
}

/**
 * Схема параметров для валидации
 */
export const createDesignTokenSchema = z.object({
  collectionId: z.string().min(1, { message: 'Collection ID is required' }),
  groupName: z.string().min(1, { message: 'Group name is required' }),
  name: z.string().min(1, { message: 'Token name is required' }),
  type: z.nativeEnum(TokenType),
  value: z.any(),
  description: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

/**
 * Обработчик инструмента create_design_token
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const createDesignTokenHandler = async (
  params: CreateDesignTokenParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Creating design token', { 
      collectionId: params.collectionId,
      groupName: params.groupName,
      name: params.name,
      type: params.type,
    });

    // Валидация параметров
    const validationResult = createDesignTokenSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    const { collectionId, groupName, name, type, value, description, meta } = params;

    // Проверяем, существует ли коллекция
    const collection = designTokensService.getCollection(collectionId);
    if (!collection) {
      return {
        success: false,
        error: `Collection with ID ${collectionId} not found`,
      };
    }

    // Создаем базовый токен
    const baseToken: Omit<DesignToken, 'id'> = {
      name,
      type,
      value,
      description,
      meta,
    } as Omit<DesignToken, 'id'>;

    try {
      // Добавляем специфичные поля в зависимости от типа токена
      switch (type) {
        case TokenType.COLOR:
          if (typeof value === 'string') {
            // Если цвет передан как строка (например, "#FF0000" или "rgba(255, 0, 0, 1)")
            (baseToken as any).rgb = parseColorToRgb(value);
          }
          break;
        case TokenType.SIZE:
        case TokenType.SPACING:
        case TokenType.RADIUS:
          if (typeof value === 'string') {
            // Если размер передан как строка (например, "12px" или "1.5rem")
            const { rawValue, unit } = parseSizeValue(value);
            (baseToken as any).rawValue = rawValue;
            (baseToken as any).unit = unit;
          }
          break;
        case TokenType.TYPOGRAPHY:
          // Типографика должна быть передана как объект с нужными полями
          if (!value || typeof value !== 'object') {
            return {
              success: false,
              error: 'Typography token value must be an object with fontFamily, fontSize, etc.',
            };
          }
          break;
      }

      // Создаем токен
      const tokenId = designTokensService.createToken(collectionId, groupName, baseToken);

      // Получаем созданный токен
      const token = designTokensService.getTokenById(collectionId, tokenId);

      return {
        success: true,
        data: {
          tokenId,
          token,
          meta: {
            collectionId,
            groupName,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create token: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  } catch (error) {
    logger.error('Error creating design token', error);
    return {
      success: false,
      error: `Failed to create design token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента create_design_token
 */
export const createDesignTokenDescription = {
  name: 'create_design_token',
  description: 'Creates a new design token in a collection.',
  parameterSchema: {
    type: 'object',
    properties: {
      collectionId: {
        type: 'string',
        description: 'The ID of the token collection',
      },
      groupName: {
        type: 'string',
        description: 'The name of the token group',
      },
      name: {
        type: 'string',
        description: 'The name of the token',
      },
      type: {
        type: 'string',
        enum: Object.values(TokenType),
        description: 'The type of the token',
      },
      value: {
        type: 'any',
        description: 'The value of the token (format depends on token type)',
      },
      description: {
        type: 'string',
        description: 'The description of the token (optional)',
      },
      meta: {
        type: 'object',
        description: 'Additional metadata for the token (optional)',
      },
    },
    required: ['collectionId', 'groupName', 'name', 'type', 'value'],
  },
  handler: createDesignTokenHandler,
};

/**
 * Преобразует строку с цветом в объект RGB
 * @param color - Строка с цветом в формате HEX, RGB или RGBA
 * @returns Объект с компонентами RGB (от 0 до 1)
 */
function parseColorToRgb(color: string): { r: number; g: number; b: number; a?: number } {
  // Преобразование HEX в RGB
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    let r, g, b;

    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }

    return { r, g, b };
  }

  // Преобразование RGB/RGBA в объект
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255;
    const g = parseInt(rgbMatch[2], 10) / 255;
    const b = parseInt(rgbMatch[3], 10) / 255;
    
    if (rgbMatch[4]) {
      const a = parseFloat(rgbMatch[4]);
      return { r, g, b, a };
    }
    
    return { r, g, b };
  }

  // Если формат не распознан, используем черный цвет
  return { r: 0, g: 0, b: 0 };
}

/**
 * Разбирает строку с размером на число и единицу измерения
 * @param size - Строка с размером (например, "12px" или "1.5rem")
 * @returns Объект с числом и единицей измерения
 */
function parseSizeValue(size: string): { rawValue: number; unit: string } {
  const match = size.match(/^([-.\d]+)([a-z%]+)$/);
  
  if (match) {
    const rawValue = parseFloat(match[1]);
    const unit = match[2];
    return { rawValue, unit };
  }
  
  // Если формат не распознан, используем пикселы
  return { rawValue: parseFloat(size) || 0, unit: 'px' };
} 