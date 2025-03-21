import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { FigmaPlugin } from '../services/figma-plugin';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для удаления узла
 */
export interface DeleteNodeParams {
  /** Ключ файла */
  fileKey: string;
  /** ID узла */
  nodeId: string;
}

/**
 * Схема параметров для валидации
 */
export const deleteNodeSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  nodeId: z.string().min(1, { message: 'Node ID is required' }),
});

/**
 * Обработчик инструмента delete_node
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const deleteNodeHandler = async (
  params: DeleteNodeParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Deleting Figma node', { 
      fileKey: params.fileKey, 
      nodeId: params.nodeId,
    });

    // Валидация параметров
    const validationResult = deleteNodeSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем экземпляр плагина Figma
    const figmaPlugin = new FigmaPlugin();

    // Удаляем узел через плагин
    const result = await figmaPlugin.deleteNode(
      params.fileKey,
      params.nodeId
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to delete node in Figma',
      };
    }

    // Возвращаем результат
    return {
      success: true,
      data: {
        meta: {
          fileKey: params.fileKey,
          nodeId: params.nodeId,
          operation: 'DELETE_NODE',
        },
      },
    };
  } catch (error) {
    logger.error('Error deleting Figma node', error);
    return {
      success: false,
      error: `Failed to delete Figma node: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента delete_node
 */
export const deleteNodeDescription = {
  name: 'delete_node',
  description: 'Deletes a node from a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file where the node is located',
      },
      nodeId: {
        type: 'string',
        description: 'The ID of the node to delete',
      },
    },
    required: ['fileKey', 'nodeId'],
  },
  handler: deleteNodeHandler,
}; 