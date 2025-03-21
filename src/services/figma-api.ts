import fetch from 'node-fetch';
import { ToolResult, FigmaNodeInfo } from '../types';

/**
 * Класс для работы с Figma API
 */
export class FigmaApi {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.figma.com/v1';

  /**
   * Конструктор
   * @param apiKey - Токен доступа к Figma API
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Figma API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Выполнить GET запрос к Figma API
   * @param endpoint - Endpoint API
   * @returns Результат запроса
   */
  private async get<T>(endpoint: string): Promise<ToolResult<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'X-Figma-Token': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Figma API error: ${response.status} - ${errorData.err || response.statusText}`,
        };
      }

      const data = await response.json() as T;
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch from Figma API: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Получить информацию о файле
   * @param fileKey - Ключ файла
   * @returns Результат запроса
   */
  async getFile(fileKey: string): Promise<ToolResult<any>> {
    return this.get(`/files/${fileKey}`);
  }

  /**
   * Получить информацию об определенных нодах в файле
   * @param fileKey - Ключ файла
   * @param nodeIds - Массив ID нод
   * @returns Результат запроса
   */
  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<ToolResult<any>> {
    const nodeIdsParam = nodeIds.join(',');
    return this.get(`/files/${fileKey}/nodes?ids=${nodeIdsParam}`);
  }

  /**
   * Получить список стилей в файле
   * @param fileKey - Ключ файла
   * @returns Результат запроса
   */
  async getFileStyles(fileKey: string): Promise<ToolResult<any>> {
    return this.get(`/files/${fileKey}/styles`);
  }

  /**
   * Получить список компонентов в файле
   * @param fileKey - Ключ файла
   * @returns Результат запроса
   */
  async getFileComponents(fileKey: string): Promise<ToolResult<any>> {
    return this.get(`/files/${fileKey}/components`);
  }

  /**
   * Получить изображения для нод
   * @param fileKey - Ключ файла
   * @param nodeIds - Массив ID нод
   * @param format - Формат изображения (jpg, png, svg, pdf)
   * @param scale - Масштаб изображения
   * @returns Результат запроса
   */
  async getImages(
    fileKey: string,
    nodeIds: string[],
    format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png',
    scale: number = 1
  ): Promise<ToolResult<any>> {
    const nodeIdsParam = nodeIds.join(',');
    return this.get(
      `/images/${fileKey}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`
    );
  }

  /**
   * Преобразовать ноду из ответа API в более простую структуру
   * @param node - Нода из ответа API
   * @param parent - Родительская нода
   * @returns Упрощенная структура ноды
   */
  simplifyNode(node: any, parent?: FigmaNodeInfo): FigmaNodeInfo {
    const {
      id,
      name,
      type,
      children,
      ...properties
    } = node;

    const simplifiedNode: FigmaNodeInfo = {
      id,
      name,
      type,
      parent,
      properties,
    };

    if (children && Array.isArray(children)) {
      simplifiedNode.children = children.map(child => this.simplifyNode(child, simplifiedNode));
    }

    return simplifiedNode;
  }
} 