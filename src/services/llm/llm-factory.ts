import { LLMAdapter, LLMAdapterOptions } from './llm-adapter';
import { OpenAIAdapter, OpenAIAdapterOptions } from './openai-adapter';
import { config } from '../../utils/config';
import { logger } from '../../utils/logger';

/**
 * Тип поддерживаемых LLM-провайдеров
 */
export type LLMProvider = 'openai' | 'anthropic' | 'local';

/**
 * Опции для создания LLM-адаптера через фабрику
 */
export interface LLMFactoryOptions {
  /** Провайдер LLM */
  provider?: LLMProvider;
  /** API-ключ */
  apiKey?: string;
  /** Модель по умолчанию */
  defaultModel?: string;
  /** Температура по умолчанию */
  defaultTemperature?: number;
  /** Максимальное количество токенов по умолчанию */
  defaultMaxTokens?: number;
  /** Включить кэширование */
  enableCaching?: boolean;
  /** Время жизни кэша в секундах */
  cacheTTL?: number;
  /** Дополнительные параметры */
  additionalOptions?: Record<string, any>;
}

/**
 * Фабрика для создания LLM-адаптеров
 */
export class LLMAdapterFactory {
  /**
   * Создать адаптер на основе опций или конфигурации
   * @param options - Опции для создания адаптера
   * @returns LLM-адаптер
   */
  static createAdapter(options?: LLMFactoryOptions): LLMAdapter {
    // Определяем провайдер из опций или конфигурации
    const provider = options?.provider || config.aiProvider || 'openai';
    
    // Используем API-ключ из опций или из конфигурации
    const apiKey = options?.apiKey || this.getApiKeyForProvider(provider);
    
    if (!apiKey) {
      throw new Error(`API key not provided for LLM provider: ${provider}`);
    }
    
    // Создаем базовые опции адаптера
    const adapterOptions: LLMAdapterOptions = {
      apiKey,
      defaultModel: options?.defaultModel || config.aiModel,
      defaultTemperature: options?.defaultTemperature || config.aiTemperature,
      defaultMaxTokens: options?.defaultMaxTokens || config.aiMaxTokens,
      enableCaching: options?.enableCaching !== undefined ? options?.enableCaching : config.llmCacheEnabled,
      cacheTTL: options?.cacheTTL || config.llmCacheTTL,
      additionalOptions: options?.additionalOptions || {},
    };
    
    // Создаем адаптер в зависимости от провайдера
    switch (provider) {
      case 'openai':
        return this.createOpenAIAdapter(adapterOptions, options?.additionalOptions);
      case 'anthropic':
        // В будущем можно добавить поддержку других моделей
        throw new Error('Anthropic provider not yet implemented');
      case 'local':
        // В будущем можно добавить поддержку локальных моделей
        throw new Error('Local provider not yet implemented');
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }
  
  /**
   * Создать адаптер OpenAI
   * @param options - Базовые опции адаптера
   * @param additionalOptions - Дополнительные опции
   * @returns Адаптер OpenAI
   */
  private static createOpenAIAdapter(options: LLMAdapterOptions, additionalOptions?: Record<string, any>): OpenAIAdapter {
    const openaiOptions: OpenAIAdapterOptions = {
      ...options,
      organization: additionalOptions?.organization || config.openaiOrganization,
      baseURL: additionalOptions?.baseURL || config.openaiBaseUrl,
    };
    
    logger.info('Creating OpenAI adapter', {
      model: openaiOptions.defaultModel,
      caching: openaiOptions.enableCaching,
    });
    
    return new OpenAIAdapter(openaiOptions);
  }
  
  /**
   * Получить API-ключ для указанного провайдера из конфигурации
   * @param provider - Провайдер LLM
   * @returns API-ключ
   */
  private static getApiKeyForProvider(provider: LLMProvider): string {
    switch (provider) {
      case 'openai':
        return config.openaiApiKey;
      case 'anthropic':
        return config.anthropicApiKey;
      case 'local':
        return ''; // Для локальных моделей ключ может не требоваться
      default:
        return '';
    }
  }
} 