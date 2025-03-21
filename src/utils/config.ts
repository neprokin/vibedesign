import { config as dotenvConfig } from 'dotenv';
import { MCPServerOptions } from '../types';
import { LogLevel } from './logger';

// Загружаем переменные окружения из .env файла
dotenvConfig();

/**
 * Получение строки из переменных окружения
 * @param key - Ключ переменной
 * @param defaultValue - Значение по умолчанию
 * @returns Значение переменной
 */
export const getEnvString = (key: string, defaultValue?: string): string | undefined => {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
};

/**
 * Получение числа из переменных окружения
 * @param key - Ключ переменной
 * @param defaultValue - Значение по умолчанию
 * @returns Значение переменной
 */
export const getEnvNumber = (key: string, defaultValue?: number): number | undefined => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const parsedValue = parseInt(value, 10);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
};

/**
 * Получение булевого значения из переменных окружения
 * @param key - Ключ переменной
 * @param defaultValue - Значение по умолчанию
 * @returns Значение переменной
 */
export const getEnvBoolean = (key: string, defaultValue?: boolean): boolean | undefined => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  return value.toLowerCase() === 'true';
};

/**
 * Конфигурация по умолчанию
 */
export const defaultConfig: MCPServerOptions = {
  port: 3333,
  mode: 'http',
  figmaApiKey: '',
  websocketUrl: 'ws://localhost:8765',
  verbose: false,
  figmaApiCacheTTL: 300, // 5 минут по умолчанию
  
  // Настройки AI
  aiProvider: 'openai',
  aiModel: 'gpt-4',
  aiTemperature: 0.7,
  aiMaxTokens: 4096,
  aiTimeout: 60000,
  
  // Настройки кэширования LLM
  llmCacheEnabled: true,
  llmCacheTTL: 3600, // 1 час
};

/**
 * Получение конфигурации из переменных окружения
 * @returns Конфигурация
 */
export const getConfig = (): MCPServerOptions => {
  return {
    port: getEnvNumber('PORT', defaultConfig.port),
    mode: (getEnvString('MODE', 'http') === 'stdio' ? 'stdio' : 'http') as 'http' | 'stdio',
    figmaApiKey: getEnvString('FIGMA_API_KEY', defaultConfig.figmaApiKey),
    websocketUrl: getEnvString('WEBSOCKET_URL', defaultConfig.websocketUrl),
    verbose: getEnvBoolean('VERBOSE', defaultConfig.verbose),
    figmaOAuthClientId: getEnvString('FIGMA_OAUTH_CLIENT_ID'),
    figmaOAuthClientSecret: getEnvString('FIGMA_OAUTH_CLIENT_SECRET'),
    figmaOAuthRedirectUri: getEnvString('FIGMA_OAUTH_REDIRECT_URI'),
    figmaApiCacheTTL: getEnvNumber('FIGMA_API_CACHE_TTL', defaultConfig.figmaApiCacheTTL),
    
    // Настройки AI
    aiProvider: getEnvString('AI_PROVIDER', defaultConfig.aiProvider),
    aiModel: getEnvString('AI_MODEL', defaultConfig.aiModel),
    aiTemperature: getEnvNumber('AI_TEMPERATURE', defaultConfig.aiTemperature),
    aiMaxTokens: getEnvNumber('AI_MAX_TOKENS', defaultConfig.aiMaxTokens),
    aiTimeout: getEnvNumber('AI_TIMEOUT', defaultConfig.aiTimeout),
    
    // Настройки кэширования LLM
    llmCacheEnabled: getEnvBoolean('LLM_CACHE_ENABLED', defaultConfig.llmCacheEnabled),
    llmCacheTTL: getEnvNumber('LLM_CACHE_TTL', defaultConfig.llmCacheTTL),
    
    // Настройки OpenAI
    openaiApiKey: getEnvString('OPENAI_API_KEY'),
    openaiOrganization: getEnvString('OPENAI_ORGANIZATION'),
    openaiBaseUrl: getEnvString('OPENAI_BASE_URL'),
    
    // Настройки Anthropic
    anthropicApiKey: getEnvString('ANTHROPIC_API_KEY'),
  };
};

/**
 * Получение уровня логирования на основе режима verbose
 * @param verbose - Расширенное логирование
 * @returns Уровень логирования
 */
export const getLogLevel = (verbose?: boolean): LogLevel => {
  return verbose ? LogLevel.DEBUG : LogLevel.INFO;
};

/**
 * Экспортируем конфигурацию
 */
export const config = getConfig(); 