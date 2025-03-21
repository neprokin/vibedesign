import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { FigmaApi } from '../services/figma-api';
import { GetComponentsParams, ToolResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Схема параметров для валидации
 */
export const getComponentsSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
  componentId: z.string().optional(),
});

/**
 * Обработчик инструмента get_components
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getComponentsHandler = async (
  params: GetComponentsParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting Figma components', { fileKey: params.fileKey, componentId: params.componentId });

    // Валидация параметров
    const validationResult = getComponentsSchema.safeParse(params);
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

    // Получаем компоненты из файла
    const result = await figmaApi.getFileComponents(params.fileKey);
    if (!result.success) {
      return result;
    }

    // Если указан ID компонента, ищем его в списке компонентов
    if (params.componentId) {
      const component = result.data.components.find(
        (comp: any) => comp.key === params.componentId
      );

      if (!component) {
        return {
          success: false,
          error: `Component with ID ${params.componentId} not found`,
        };
      }

      // Форматируем и возвращаем результат для конкретного компонента
      return {
        success: true,
        data: {
          component: formatComponent(component),
          meta: {
            fileKey: params.fileKey,
          },
        },
      };
    }

    // Форматируем и возвращаем результат для всех компонентов
    return {
      success: true,
      data: {
        components: result.data.components.map(formatComponent),
        meta: {
          total: result.data.components.length,
          fileKey: params.fileKey,
        },
      },
    };
  } catch (error) {
    logger.error('Error getting Figma components', error);
    return {
      success: false,
      error: `Failed to get Figma components: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Форматирует компонент для вывода
 * @param component - Компонент из Figma API
 * @returns Отформатированный компонент
 */
function formatComponent(component: any): any {
  return {
    id: component.key,
    name: component.name,
    description: component.description || '',
    nodeId: component.node_id,
    thumbnailUrl: component.thumbnail_url,
    containingFrame: component.containing_frame ? {
      name: component.containing_frame.name,
      nodeId: component.containing_frame.node_id,
      pageName: component.containing_frame.page_name || '',
    } : null,
    componentSetId: component.component_set_id || null,
    isComponentSet: !!component.component_set_id,
  };
}

/**
 * Описание инструмента get_components
 */
export const getComponentsDescription = {
  name: 'get_components',
  description: 'Gets information about components in a Figma file.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file to fetch components from',
      },
      componentId: {
        type: 'string',
        description: 'Optional ID of the specific component to fetch',
      },
    },
    required: ['fileKey'],
  },
  handler: getComponentsHandler,
}; 