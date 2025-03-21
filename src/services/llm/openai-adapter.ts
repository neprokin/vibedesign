import { OpenAI } from 'openai';
import NodeCache from 'node-cache';
import { LLMRequest, LLMResponse, LLMAdapterOptions, BaseLLMAdapter } from './llm-adapter';
import { logger } from '../../utils/logger';

/**
 * Опции адаптера OpenAI
 */
export interface OpenAIAdapterOptions extends LLMAdapterOptions {
  /** ID организации (опционально) */
  organization?: string;
  /** Базовый URL API (для Enterprise / Azure) */
  baseURL?: string;
}

/**
 * Адаптер для работы с OpenAI API
 */
export class OpenAIAdapter extends BaseLLMAdapter {
  private client: OpenAI;
  private cache: NodeCache | null = null;
  private defaultModel: string;
  
  /**
   * Конструктор
   * @param options - Опции адаптера
   */
  constructor(options: OpenAIAdapterOptions) {
    super(options);
    
    this.client = new OpenAI({
      apiKey: options.apiKey,
      organization: options.organization,
      baseURL: options.baseURL,
      timeout: options.timeout,
      maxRetries: 3,
    });
    
    this.defaultModel = options.defaultModel || 'gpt-4';
    
    if (options.enableCaching) {
      this.cache = new NodeCache({
        stdTTL: options.cacheTTL,
        checkperiod: Math.min(options.cacheTTL! / 2, 600),
        useClones: false,
      });
      
      logger.info('OpenAI adapter initialized with caching', {
        defaultModel: this.defaultModel,
        cacheTTL: options.cacheTTL,
      });
    } else {
      logger.info('OpenAI adapter initialized without caching', {
        defaultModel: this.defaultModel,
      });
    }
  }
  
  /**
   * Отправить запрос и получить ответ от OpenAI API
   * @param request - Запрос к LLM
   * @returns Ответ от LLM
   */
  async sendPrompt(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Проверяем кэш, если включен
      if (this.options.enableCaching && this.cache) {
        const cacheKey = this.getCacheKey(request);
        const cachedResponse = this.cache.get<LLMResponse>(cacheKey);
        
        if (cachedResponse) {
          logger.debug('Using cached response for prompt', {
            promptLength: request.prompt.length,
          });
          
          return {
            ...cachedResponse,
            meta: {
              ...(cachedResponse.meta || {}),
              cached: true,
            },
          };
        }
      }
      
      // Формируем параметры запроса
      const messages = [];
      
      // Добавляем системное сообщение, если указано
      if (request.systemMessage) {
        messages.push({
          role: 'system' as const,
          content: request.systemMessage,
        });
      }
      
      // Добавляем основной запрос
      messages.push({
        role: 'user' as const,
        content: request.prompt,
      });
      
      // Выполняем запрос к API
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages,
        temperature: request.temperature ?? this.options.defaultTemperature,
        max_tokens: request.maxTokens ?? this.options.defaultMaxTokens,
        stop: request.stopSequences,
        stream: false,
      });
      
      // Формируем ответ
      const result: LLMResponse = {
        content: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        meta: {
          model: response.model,
          finishReason: response.choices[0]?.finish_reason,
        },
      };
      
      // Сохраняем в кэш, если включен
      if (this.options.enableCaching && this.cache) {
        const cacheKey = this.getCacheKey(request);
        this.cache.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      logger.error('Error calling OpenAI API', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Отправить запрос и получать ответ по частям от OpenAI API
   * @param request - Запрос к LLM
   * @param callback - Функция обратного вызова для обработки частей ответа
   * @returns Финальный ответ от LLM
   */
  async streamPrompt(request: LLMRequest, callback: (chunk: string) => void): Promise<LLMResponse> {
    try {
      // Формируем параметры запроса
      const messages = [];
      
      // Добавляем системное сообщение, если указано
      if (request.systemMessage) {
        messages.push({
          role: 'system' as const,
          content: request.systemMessage,
        });
      }
      
      // Добавляем основной запрос
      messages.push({
        role: 'user' as const,
        content: request.prompt,
      });
      
      // Выполняем потоковый запрос к API
      const stream = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages,
        temperature: request.temperature ?? this.options.defaultTemperature,
        max_tokens: request.maxTokens ?? this.options.defaultMaxTokens,
        stop: request.stopSequences,
        stream: true,
      });
      
      let fullContent = '';
      let usage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
      
      // Обрабатываем поток
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          callback(content);
        }
      }
      
      // Формируем финальный ответ
      const result: LLMResponse = {
        content: fullContent,
        usage,
        meta: {
          model: this.defaultModel,
          streamed: true,
        },
      };
      
      return result;
    } catch (error) {
      logger.error('Error streaming from OpenAI API', error);
      throw new Error(`OpenAI API streaming error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 