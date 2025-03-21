import { MCPRequest } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import { FigmaApi } from '../services/figma-api';
import { GetDocumentInfoParams, ToolResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Схема параметров для валидации
 */
export const getDocumentInfoSchema = z.object({
  fileKey: z.string().min(1, { message: 'File key is required' }),
});

/**
 * Обработчик инструмента get_document_info
 * @param params - Параметры инструмента
 * @param request - Запрос MCP
 * @returns Результат выполнения инструмента
 */
export const getDocumentInfoHandler = async (
  params: GetDocumentInfoParams,
  request: MCPRequest
): Promise<ToolResult<any>> => {
  try {
    logger.info('Getting Figma document info', { fileKey: params.fileKey });

    // Валидация параметров
    const validationResult = getDocumentInfoSchema.safeParse(params);
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

    // Получаем информацию о файле
    const result = await figmaApi.getFile(params.fileKey);
    if (!result.success) {
      return result;
    }

    // Извлекаем и структурируем необходимую информацию о документе
    const document = result.data.document;
    const name = result.data.name;
    const lastModified = result.data.lastModified;
    const version = result.data.version;
    const thumbnailUrl = result.data.thumbnailUrl;
    const pages = extractPages(document);
    const statistics = extractStatistics(document);

    // Форматируем и возвращаем результат
    return {
      success: true,
      data: {
        name,
        lastModified,
        version,
        thumbnailUrl,
        pages,
        statistics,
        schemaVersion: result.data.schemaVersion,
        fileKey: params.fileKey,
      },
    };
  } catch (error) {
    logger.error('Error getting Figma document info', error);
    return {
      success: false,
      error: `Failed to get Figma document info: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Извлекает информацию о страницах из документа
 * @param document - Документ из Figma API
 * @returns Информация о страницах
 */
function extractPages(document: any): any[] {
  if (!document.children || !Array.isArray(document.children)) {
    return [];
  }

  return document.children.map((page: any) => ({
    id: page.id,
    name: page.name,
    type: page.type,
    childrenCount: page.children ? page.children.length : 0,
  }));
}

/**
 * Извлекает статистику из документа
 * @param document - Документ из Figma API
 * @returns Статистика документа
 */
function extractStatistics(document: any): any {
  let frameCount = 0;
  let componentCount = 0;
  let textCount = 0;
  let imageCount = 0;
  let totalNodeCount = 0;

  // Рекурсивная функция для подсчета элементов
  function countNodes(node: any): void {
    if (!node) return;
    totalNodeCount++;

    // Подсчет по типам
    switch (node.type) {
      case 'FRAME':
      case 'GROUP':
        frameCount++;
        break;
      case 'COMPONENT':
      case 'COMPONENT_SET':
      case 'INSTANCE':
        componentCount++;
        break;
      case 'TEXT':
        textCount++;
        break;
      case 'IMAGE':
        imageCount++;
        break;
    }

    // Рекурсивный обход дочерних элементов
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(countNodes);
    }
  }

  // Начинаем подсчет с корневого документа
  if (document.children && Array.isArray(document.children)) {
    document.children.forEach(countNodes);
  }

  return {
    totalNodeCount,
    frameCount,
    componentCount,
    textCount,
    imageCount,
    pageCount: document.children ? document.children.length : 0,
  };
}

/**
 * Описание инструмента get_document_info
 */
export const getDocumentInfoDescription = {
  name: 'get_document_info',
  description: 'Gets general information about a Figma document.',
  parameterSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description: 'The key of the Figma file to fetch information from',
      },
    },
    required: ['fileKey'],
  },
  handler: getDocumentInfoHandler,
}; 