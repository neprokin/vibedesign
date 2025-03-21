import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { FigmaApi } from '../services/figma-api';
import { ToolResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Интерфейс параметров для инструмента get_selection
 */
export interface GetSelectionParams {
  /** Ключ файла */
  fileKey: string;
  /** ID выбранных нод */
  nodeIds: string[];
  /** Глубина обхода дерева (опционально) */
  depth?: number;
}

/**
 * Схема параметров для валидации
 */
export const getSelectionSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  nodeIds: z.array(z.string()).min(1, { message: 'At least one node ID is required' }),
  depth: z.number().int().min(0).max(10).optional(),
});

/**
 * Обработчик инструмента get_selection
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getSelectionHandler = async (
  params: GetSelectionParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting Figma selection', { 
      fileKey: params.fileKey, 
      nodeIds: params.nodeIds,
      depth: params.depth 
    });

    // Валидация параметров
    const validationResult = getSelectionSchema.safeParse(params);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid parameters: ${validationResult.error.message}`,
      };
    }

    // Получаем Figma API ключ из MCP запроса
    const figmaApiKey = request.env?.FIGMA_API_KEY;
    if (!figmaApiKey) {
      return {
        success: false,
        error: 'Figma API key is not provided in environment variables',
      };
    }

    // Создаем экземпляр Figma API клиента
    const figmaApi = new FigmaApi(figmaApiKey);

    // Получаем информацию о выбранных нодах
    const result = await figmaApi.getFileNodes(params.fileKey, params.nodeIds);
    if (!result.success) {
      return result;
    }

    // Процесс данные и преобразуем их в более удобный формат
    const nodes = result.data.nodes;
    const processedNodes = processNodes(nodes, params.depth || 0);

    // Форматируем и возвращаем результат
    return {
      success: true,
      data: {
        selection: processedNodes,
        meta: {
          count: processedNodes.length,
          fileKey: params.fileKey,
          depth: params.depth || 0,
        },
      },
    };
  } catch (error) {
    logger.error('Error getting Figma selection', error);
    return {
      success: false,
      error: `Failed to get Figma selection: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Обрабатывает полученные ноды и преобразует их в удобный формат
 * @param nodes - Ноды из ответа Figma API
 * @param depth - Глубина обхода дерева
 * @returns Обработанные ноды
 */
function processNodes(nodes: Record<string, any>, depth: number): any[] {
  const processedNodes: any[] = [];

  // Обрабатываем каждую ноду
  for (const nodeId in nodes) {
    if (nodes.hasOwnProperty(nodeId) && nodes[nodeId].document) {
      const node = nodes[nodeId].document;
      processedNodes.push(processNode(node, depth));
    }
  }

  return processedNodes;
}

/**
 * Обрабатывает одну ноду рекурсивно до указанной глубины
 * @param node - Нода из ответа Figma API
 * @param depth - Глубина обхода дерева
 * @param currentDepth - Текущая глубина (для рекурсии)
 * @returns Обработанная нода
 */
function processNode(node: any, depth: number, currentDepth: number = 0): any {
  // Базовые свойства ноды
  const processedNode: any = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  // Добавляем специфические свойства в зависимости от типа ноды
  switch (node.type) {
    case 'FRAME':
    case 'GROUP':
      processedNode.width = node.size?.width;
      processedNode.height = node.size?.height;
      processedNode.position = {
        x: node.absoluteBoundingBox?.x,
        y: node.absoluteBoundingBox?.y
      };
      processedNode.backgroundColor = node.backgroundColor;
      break;
    case 'TEXT':
      processedNode.characters = node.characters;
      processedNode.style = {
        fontFamily: node.style?.fontFamily,
        fontSize: node.style?.fontSize,
        fontWeight: node.style?.fontWeight,
        textAlignHorizontal: node.style?.textAlignHorizontal,
        textAlignVertical: node.style?.textAlignVertical,
        fills: node.fills
      };
      break;
    case 'COMPONENT':
    case 'INSTANCE':
      processedNode.componentId = node.componentId;
      processedNode.width = node.size?.width;
      processedNode.height = node.size?.height;
      break;
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'VECTOR':
      processedNode.fills = node.fills;
      processedNode.strokes = node.strokes;
      processedNode.strokeWeight = node.strokeWeight;
      processedNode.effects = node.effects;
      break;
  }

  // Рекурсивно обрабатываем детей, если не достигли максимальной глубины
  if (depth > currentDepth && node.children && Array.isArray(node.children)) {
    processedNode.children = node.children.map((child: any) => 
      processNode(child, depth, currentDepth + 1)
    );
  }

  return processedNode;
}

/**
 * Описание инструмента get_selection
 */
export const getSelectionDescription = {
  name: 'get_selection',
  description: 'Gets information about selected nodes in a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file containing the selection',
      },
      nodeIds: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of node IDs to fetch information for',
      },
      depth: {
        type: 'number',
        description: 'How many levels deep to traverse the node tree (0-10)',
      },
    },
    required: ['fileKey', 'nodeIds'],
  },
  handler: getSelectionHandler,
}; 