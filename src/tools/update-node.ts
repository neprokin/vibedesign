import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { ToolResult } from '../types';
import { FigmaPlugin } from '../services/figma-plugin';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для обновления узла
 */
export interface UpdateNodeParams {
  /** Ключ файла */
  fileKey: string;
  /** ID узла */
  nodeId: string;
  /** Свойства для обновления */
  properties: Record<string, any>;
}

/**
 * Схема параметров для валидации
 */
export const updateNodeSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  nodeId: z.string().min(1, { message: 'Node ID is required' }),
  properties: z.record(z.any()).refine(props => Object.keys(props).length > 0, {
    message: 'At least one property must be specified for update'
  }),
});

/**
 * Обработчик инструмента update_node
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const updateNodeHandler = async (
  params: UpdateNodeParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Updating Figma node', { 
      fileKey: params.fileKey, 
      nodeId: params.nodeId,
      properties: Object.keys(params.properties).join(', ')
    });

    // Валидация параметров
    const validationResult = updateNodeSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Создаем экземпляр плагина Figma
    const figmaPlugin = new FigmaPlugin();

    // Обновляем узел через плагин
    const result = await figmaPlugin.updateNode(
      params.fileKey,
      params.nodeId,
      params.properties
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to update node in Figma',
      };
    }

    // Возвращаем результат
    return {
      success: true,
      data: {
        node: result.node,
        meta: {
          fileKey: params.fileKey,
          nodeId: params.nodeId,
          operation: 'UPDATE_NODE',
        },
      },
    };
  } catch (error) {
    logger.error('Error updating Figma node', error);
    return {
      success: false,
      error: `Failed to update Figma node: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Описание инструмента update_node
 */
export const updateNodeDescription = {
  name: 'update_node',
  description: 'Updates properties of a node in a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file where the node is located',
      },
      nodeId: {
        type: 'string',
        description: 'The ID of the node to update',
      },
      properties: {
        type: 'object',
        description: 'A map of properties to update on the node. Varies based on node type (e.g., text, fills, effects, etc.)',
      },
    },
    required: ['fileKey', 'nodeId', 'properties'],
  },
  handler: updateNodeHandler,
}; 