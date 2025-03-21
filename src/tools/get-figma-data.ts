import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { FigmaApi } from '../services/figma-api';
import { GetFigmaDataParams, ToolResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Схема параметров для валидации
 */
export const getFigmaDataSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  nodeId: z.string().optional(),
  depth: z.number().int().min(0).max(10).optional(),
});

/**
 * Обработчик инструмента get_figma_data
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getFigmaDataHandler = async (
  params: GetFigmaDataParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting Figma data', { fileKey: params.fileKey, nodeId: params.nodeId });

    // Валидация параметров
    const validationResult = getFigmaDataSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Получаем Figma API ключ из MCP запроса (или его можно передать как параметр)
    const figmaApiKey = request.env?.FIGMA_API_KEY;
    if (!figmaApiKey) {
      return {
        success: false,
        error: 'Figma API key is not provided in environment variables',
      };
    }

    // Создаем экземпляр Figma API клиента
    const figmaApi = new FigmaApi(figmaApiKey);

    let result: ToolResult<any>;

    // Если указан ID ноды, получаем информацию о конкретной ноде
    if (params.nodeId) {
      result = await figmaApi.getFileNodes(params.fileKey, [params.nodeId]);
    } else {
      // Иначе получаем информацию о всем файле
      result = await figmaApi.getFile(params.fileKey);
    }

    if (!result.success) {
      return result;
    }

    // Если была указана глубина обхода, но не указан ID ноды,
    // используем корневую ноду документа
    const depth = params.depth ?? 0;
    
    // Обрабатываем результат в зависимости от типа запроса
    let processedData: any;
    
    if (params.nodeId) {
      // Для конкретной ноды
      const node = result.data.nodes[params.nodeId]?.document;
      if (!node) {
        return {
          success: false,
          error: `Node with ID ${params.nodeId} not found`,
        };
      }
      
      // Преобразуем ноду в более простую структуру
      processedData = figmaApi.simplifyNode(node);
    } else {
      // Для всего файла - берем документ
      const document = result.data.document;
      if (!document) {
        return {
          success: false,
          error: 'Document not found in Figma file',
        };
      }
      
      // Преобразуем документ в более простую структуру
      processedData = figmaApi.simplifyNode(document);
    }

    return {
      success: true,
      data: processedData,
    };
  } catch (error) {
    logger.error('Error getting Figma data', error);
    return {
      success: false,
      error: `Failed to get Figma data: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента get_figma_data
 */
export const getFigmaDataDescription = {
  name: 'get_figma_data',
  description: 'Gets information about a Figma file or a specific node within a file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file to fetch, often found in a provided URL like figma.com/(file|design)/<fileKey>/...',
      },
      nodeId: {
        type: 'string',
        description: 'The ID of the node to fetch, often found as URL parameter node-id=',
      },
      depth: {
        type: 'number',
        description: 'How many levels deep to traverse the node tree, only used if explicitly requested',
      },
    },
    required: ['fileKey'],
  },
  handler: getFigmaDataHandler,
}; 