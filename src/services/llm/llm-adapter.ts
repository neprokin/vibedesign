/**
 * Типы для работы с LLM-моделями
 */

/**
 * Запрос к LLM
 */
export interface LLMRequest {
  /** Основной текст запроса */
  prompt: string;
  /** Температура генерации (0.0-2.0), влияет на случайность */
  temperature?: number;
  /** Максимальное количество токенов в ответе */
  maxTokens?: number;
  /** Последовательности для остановки генерации */
  stopSequences?: string[];
  /** Системное сообщение (инструкция для модели) */
  systemMessage?: string;
  /** Дополнительный контекст */
  context?: Record<string, any>;
}

/**
 * Ответ от LLM
 */
export interface LLMResponse {
  /** Текст ответа */
  content: string;
  /** Информация об использовании токенов */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Метаданные */
  meta?: Record<string, any>;
}

/**
 * Опции LLM-адаптера
 */
export interface LLMAdapterOptions {
  /** API-ключ */
  apiKey: string;
  /** Модель по умолчанию */
  defaultModel?: string;
  /** Температура по умолчанию */
  defaultTemperature?: number;
  /** Максимальное количество токенов по умолчанию */
  defaultMaxTokens?: number;
  /** Таймаут запросов в миллисекундах */
  timeout?: number;
  /** Включить кэширование */
  enableCaching?: boolean;
  /** Время жизни кэша в секундах */
  cacheTTL?: number;
  /** Дополнительные параметры */
  additionalOptions?: Record<string, any>;
}

/**
 * Интерфейс LLM-адаптера
 */
export interface LLMAdapter {
  /**
   * Отправить запрос и получить ответ
   * @param request - Запрос к LLM
   * @returns Ответ от LLM
   */
  sendPrompt(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Отправить запрос и получать ответ по частям
   * @param request - Запрос к LLM
   * @param callback - Функция обратного вызова для обработки частей ответа
   * @returns Финальный ответ от LLM
   */
  streamPrompt(request: LLMRequest, callback: (chunk: string) => void): Promise<LLMResponse>;
}

/**
 * Абстрактный класс LLM-адаптера
 */
export abstract class BaseLLMAdapter implements LLMAdapter {
  protected options: LLMAdapterOptions;
  
  /**
   * Конструктор
   * @param options - Опции адаптера
   */
  constructor(options: LLMAdapterOptions) {
    this.options = {
      ...options,
      defaultTemperature: options.defaultTemperature || 0.7,
      defaultMaxTokens: options.defaultMaxTokens || 2048,
      timeout: options.timeout || 60000,
      enableCaching: options.enableCaching !== undefined ? options.enableCaching : true,
      cacheTTL: options.cacheTTL || 3600,
    };
  }
  
  /**
   * Отправить запрос и получить ответ
   * @param request - Запрос к LLM
   * @returns Ответ от LLM
   */
  abstract sendPrompt(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Отправить запрос и получать ответ по частям
   * @param request - Запрос к LLM
   * @param callback - Функция обратного вызова для обработки частей ответа
   * @returns Финальный ответ от LLM
   */
  abstract streamPrompt(request: LLMRequest, callback: (chunk: string) => void): Promise<LLMResponse>;
  
  /**
   * Сформировать ключ кэша для запроса
   * @param request - Запрос к LLM
   * @returns Ключ кэша
   */
  protected getCacheKey(request: LLMRequest): string {
    const { prompt, temperature, maxTokens, systemMessage, stopSequences } = request;
    return `${prompt}|${temperature}|${maxTokens}|${systemMessage}|${stopSequences?.join(',')}`;
  }
} 