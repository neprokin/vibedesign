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
  verbose: false,
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
    verbose: getEnvBoolean('VERBOSE', defaultConfig.verbose),
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