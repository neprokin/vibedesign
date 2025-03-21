import fetch from 'node-fetch';
import { ToolResult, FigmaNodeInfo } from '../types';
import { logger } from '../utils/logger';
import NodeCache from 'node-cache';
import { config } from '../utils/config';

/**
 * Интерфейс параметров кэширования
 */
export interface CacheOptions {
  /** Время жизни кэша в секундах */
  ttl: number;
  /** Флаг, указывающий, нужно ли проверять актуальность кэша (при true будет выполнен HEAD запрос) */
  checkFreshness?: boolean;
}

/**
 * Интерфейс токена Figma
 */
export interface FigmaToken {
  /** Токен доступа */
  accessToken: string;
  /** Тип токена (обычно 'bearer') */
  tokenType: string;
  /** Срок действия токена в секундах */
  expiresIn?: number;
  /** Время создания токена (Unix timestamp) */
  createdAt: number;
  /** Refresh токен (для OAuth2) */
  refreshToken?: string;
  /** Приложение, создавшее токен */
  appId?: string;
  /** ID пользователя */
  userId?: string;
}

/**
 * Класс для работы с Figma API с поддержкой авторизации и кэширования
 */
export class EnhancedFigmaApi {
  private readonly baseUrl = 'https://api.figma.com/v1';
  private readonly oauthUrl = 'https://www.figma.com/oauth';
  private token: FigmaToken | null;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly redirectUri?: string;
  private readonly cache: NodeCache;
  private readonly defaultCacheOptions: CacheOptions = {
    ttl: 300, // 5 минут по умолчанию
    checkFreshness: false,
  };
  
  /**
   * Конструктор
   * @param accessToken - Токен доступа Figma API (для Personal Access Token)
   * @param clientId - ID OAuth2 клиента (для OAuth2)
   * @param clientSecret - Секрет OAuth2 клиента (для OAuth2)
   * @param redirectUri - URI перенаправления для OAuth2
   * @param cacheOptions - Параметры кэширования
   */
  constructor(
    accessToken?: string,
    clientId?: string,
    clientSecret?: string,
    redirectUri?: string,
    cacheOptions?: Partial<CacheOptions>
  ) {
    // Инициализируем кэш с указанными параметрами или значениями по умолчанию
    this.cache = new NodeCache({
      stdTTL: cacheOptions?.ttl || this.defaultCacheOptions.ttl,
      checkperiod: Math.min((cacheOptions?.ttl || this.defaultCacheOptions.ttl) / 2, 60),
      useClones: false, // Не клонировать объекты для лучшей производительности
    });
    
    // Если передан accessToken, создаем токен напрямую
    if (accessToken) {
      this.token = {
        accessToken,
        tokenType: 'bearer',
        createdAt: Date.now(),
      };
    } else {
      this.token = null;
    }
    
    // Сохраняем параметры OAuth2
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    
    // Логируем инициализацию
    logger.info('Enhanced Figma API initialized', {
      hasAccessToken: !!accessToken,
      hasOAuthCredentials: !!(clientId && clientSecret),
      cacheEnabled: true,
      cacheTTL: cacheOptions?.ttl || this.defaultCacheOptions.ttl,
    });
  }
  
  /**
   * Проверить, действителен ли текущий токен
   * @returns true, если токен действителен
   */
  public isTokenValid(): boolean {
    if (!this.token) {
      return false;
    }
    
    // Если у токена есть срок действия, проверяем его
    if (this.token.expiresIn) {
      const expiresAt = this.token.createdAt + this.token.expiresIn * 1000;
      // Токен действителен, если до истечения срока действия осталось более 5 минут
      return Date.now() < expiresAt - 5 * 60 * 1000;
    }
    
    // Если у токена нет срока действия (Personal Access Token), считаем его всегда действительным
    return true;
  }
  
  /**
   * Получить токен OAuth2 по коду авторизации
   * @param code - Код авторизации
   * @returns Результат операции
   */
  public async getTokenByCode(code: string): Promise<ToolResult<FigmaToken>> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      return {
        success: false,
        error: 'OAuth2 credentials are not set',
      };
    }
    
    try {
      const response = await fetch(`${this.oauthUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code,
          grant_type: 'authorization_code',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Failed to get token: ${response.status} - ${errorData.error || response.statusText}`,
        };
      }
      
      const data = await response.json();
      
      this.token = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
        refreshToken: data.refresh_token,
      };
      
      return {
        success: true,
        data: this.token,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get token: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Обновить токен OAuth2 с помощью refresh_token
   * @returns Результат операции
   */
  public async refreshToken(): Promise<ToolResult<FigmaToken>> {
    if (!this.token?.refreshToken || !this.clientId || !this.clientSecret) {
      return {
        success: false,
        error: 'Refresh token or OAuth2 credentials are not set',
      };
    }
    
    try {
      const response = await fetch(`${this.oauthUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.token.refreshToken,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: `Failed to refresh token: ${response.status} - ${errorData.error || response.statusText}`,
        };
      }
      
      const data = await response.json();
      
      this.token = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        createdAt: Date.now(),
        refreshToken: data.refresh_token || this.token.refreshToken,
      };
      
      return {
        success: true,
        data: this.token,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to refresh token: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  /**
   * Установить токен
   * @param token - Токен для установки
   */
  public setToken(token: FigmaToken): void {
    this.token = token;
  }
  
  /**
   * Получить текущий токен
   * @returns Текущий токен или null
   */
  public getToken(): FigmaToken | null {
    return this.token;
  }
  
  /**
   * Очистить токен
   */
  public clearToken(): void {
    this.token = null;
  }
  
  /**
   * Получить URL для авторизации OAuth2
   * @param scopes - Массив скоупов доступа
   * @param state - Произвольная строка для проверки запроса
   * @returns URL для авторизации
   */
  public getAuthorizationUrl(scopes: string[], state?: string): string {
    if (!this.clientId || !this.redirectUri) {
      throw new Error('OAuth2 credentials are not set');
    }
    
    const scopesStr = scopes.join(' ');
    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
    
    return `${this.oauthUrl}/authorize?client_id=${encodeURIComponent(this.clientId)}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(scopesStr)}&response_type=code${stateParam}`;
  }
  
  /**
   * Выполнить GET запрос к Figma API с поддержкой кэширования
   * @param endpoint - Endpoint API
   * @param cacheOptions - Параметры кэширования
   * @returns Результат запроса
   */
  private async get<T>(endpoint: string, cacheOptions?: Partial<CacheOptions>): Promise<ToolResult<T>> {
    // Если токен недействителен и есть refresh token, пытаемся обновить токен
    if (!this.isTokenValid() && this.token?.refreshToken) {
      const refreshResult = await this.refreshToken();
      if (!refreshResult.success) {
        return {
          success: false,
          error: `Failed to refresh token: ${refreshResult.error}`,
        };
      }
    }
    
    // Если токен все еще недействителен, возвращаем ошибку
    if (!this.isTokenValid()) {
      return {
        success: false,
        error: 'No valid token available',
      };
    }
    
    // Создаем ключ кэша из эндпоинта
    const cacheKey = `figma_api_${endpoint}`;
    
    // Объединяем параметры кэширования с параметрами по умолчанию
    const options: CacheOptions = {
      ...this.defaultCacheOptions,
      ...(cacheOptions || {}),
    };
    
    // Пытаемся получить данные из кэша
    const cachedData = this.cache.get<T>(cacheKey);
    if (cachedData !== undefined) {
      // Если нужно проверить свежесть данных, делаем HEAD запрос
      if (options.checkFreshness) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${this.token!.accessToken}`,
            },
          });
          
          // Если есть заголовок ETag или Last-Modified, можно сравнить с сохраненными значениями
          // Но для простоты просто проверяем статус ответа
          if (response.ok) {
            return {
              success: true,
              data: cachedData,
              meta: { cached: true },
            };
          }
        } catch (error) {
          // Если HEAD запрос не удался, просто используем кэшированные данные
          return {
            success: true,
            data: cachedData,
            meta: { cached: true, freshness_check_failed: true },
          };
        }
      } else {
        // Возвращаем кэшированные данные без проверки
        return {
          success: true,
          data: cachedData,
          meta: { cached: true },
        };
      }
    }
    
    // Если кэшированных данных нет или они устарели, выполняем запрос
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token!.accessToken}`,
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
      
      // Сохраняем данные в кэш
      this.cache.set(cacheKey, data, options.ttl);
      
      return {
        success: true,
        data,
        meta: { cached: false },
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
   * @param cacheOptions - Параметры кэширования
   * @returns Результат запроса
   */
  async getFile(fileKey: string, cacheOptions?: Partial<CacheOptions>): Promise<ToolResult<any>> {
    return this.get(`/files/${fileKey}`, cacheOptions);
  }
  
  /**
   * Получить информацию об определенных нодах в файле
   * @param fileKey - Ключ файла
   * @param nodeIds - Массив ID нод
   * @param cacheOptions - Параметры кэширования
   * @returns Результат запроса
   */
  async getFileNodes(fileKey: string, nodeIds: string[], cacheOptions?: Partial<CacheOptions>): Promise<ToolResult<any>> {
    const nodeIdsParam = nodeIds.join(',');
    return this.get(`/files/${fileKey}/nodes?ids=${nodeIdsParam}`, cacheOptions);
  }
  
  /**
   * Получить список стилей в файле
   * @param fileKey - Ключ файла
   * @param cacheOptions - Параметры кэширования
   * @returns Результат запроса
   */
  async getFileStyles(fileKey: string, cacheOptions?: Partial<CacheOptions>): Promise<ToolResult<any>> {
    return this.get(`/files/${fileKey}/styles`, cacheOptions);
  }
  
  /**
   * Получить список компонентов в файле
   * @param fileKey - Ключ файла
   * @param cacheOptions - Параметры кэширования
   * @returns Результат запроса
   */
  async getFileComponents(fileKey: string, cacheOptions?: Partial<CacheOptions>): Promise<ToolResult<any>> {
    return this.get(`/files/${fileKey}/components`, cacheOptions);
  }
  
  /**
   * Получить изображения для нод
   * @param fileKey - Ключ файла
   * @param nodeIds - Массив ID нод
   * @param format - Формат изображения (jpg, png, svg, pdf)
   * @param scale - Масштаб изображения
   * @param cacheOptions - Параметры кэширования
   * @returns Результат запроса
   */
  async getImages(
    fileKey: string,
    nodeIds: string[],
    format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png',
    scale: number = 1,
    cacheOptions?: Partial<CacheOptions>
  ): Promise<ToolResult<any>> {
    const nodeIdsParam = nodeIds.join(',');
    return this.get(
      `/images/${fileKey}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`,
      cacheOptions
    );
  }
  
  /**
   * Получить информацию о текущем пользователе
   * @returns Результат запроса
   */
  async getMe(): Promise<ToolResult<any>> {
    return this.get('/me');
  }
  
  /**
   * Получить список команд пользователя
   * @returns Результат запроса
   */
  async getTeams(): Promise<ToolResult<any>> {
    return this.get('/teams');
  }
  
  /**
   * Получить список проектов команды
   * @param teamId - ID команды
   * @returns Результат запроса
   */
  async getTeamProjects(teamId: string): Promise<ToolResult<any>> {
    return this.get(`/teams/${teamId}/projects`);
  }
  
  /**
   * Получить список файлов проекта
   * @param projectId - ID проекта
   * @returns Результат запроса
   */
  async getProjectFiles(projectId: string): Promise<ToolResult<any>> {
    return this.get(`/projects/${projectId}/files`);
  }
  
  /**
   * Очистить кэш для определенного ключа
   * @param cacheKey - Ключ кэша (если не указан, то используется endpoint)
   * @param endpoint - Endpoint API
   */
  clearCache(cacheKey?: string, endpoint?: string): void {
    if (cacheKey) {
      this.cache.del(cacheKey);
    } else if (endpoint) {
      this.cache.del(`figma_api_${endpoint}`);
    }
  }
  
  /**
   * Очистить весь кэш
   */
  clearAllCache(): void {
    this.cache.flushAll();
  }
  
  /**
   * Получить статистику кэша
   * @returns Статистика кэша
   */
  getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  } {
    return this.cache.getStats();
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
  
  /**
   * Создать экземпляр EnhancedFigmaApi из конфигурации
   * @returns Экземпляр EnhancedFigmaApi
   */
  static fromConfig(): EnhancedFigmaApi {
    const accessToken = config.figmaApiKey;
    const clientId = config.figmaOAuthClientId;
    const clientSecret = config.figmaOAuthClientSecret;
    const redirectUri = config.figmaOAuthRedirectUri;
    const cacheTTL = config.figmaApiCacheTTL || 300;
    
    return new EnhancedFigmaApi(
      accessToken,
      clientId,
      clientSecret,
      redirectUri,
      { ttl: cacheTTL }
    );
  }
} 