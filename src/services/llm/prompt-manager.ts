import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { config } from '../../utils/config';

/**
 * Переменная в шаблоне промпта
 */
export interface PromptVariable {
  /** Имя переменной */
  name: string;
  /** Описание переменной */
  description?: string;
  /** Требуется ли переменная */
  required?: boolean;
  /** Значение по умолчанию */
  defaultValue?: string;
}

/**
 * Шаблон промпта
 */
export interface PromptTemplate {
  /** Идентификатор шаблона */
  id: string;
  /** Описание шаблона */
  description: string;
  /** Текст шаблона */
  template: string;
  /** Переменные в шаблоне */
  variables: string[] | PromptVariable[];
  /** Системное сообщение */
  systemMessage?: string;
  /** Параметры по умолчанию */
  defaultParams?: Record<string, any>;
}

/**
 * Параметры для заполнения шаблона
 */
export interface FillTemplateParams {
  /** Данные для заполнения переменных */
  data: Record<string, any>;
  /** Использовать значения по умолчанию для отсутствующих переменных */
  useDefaults?: boolean;
  /** Игнорировать отсутствующие переменные (заменять на пустую строку) */
  ignoreAbsent?: boolean;
  /** Добавить системное сообщение из шаблона */
  includeSystemMessage?: boolean;
}

/**
 * Результат заполнения шаблона
 */
export interface FilledTemplate {
  /** Текст промпта */
  prompt: string;
  /** Системное сообщение (если есть) */
  systemMessage?: string;
  /** Использованные значения переменных */
  variables: Record<string, any>;
  /** Предупреждения */
  warnings: string[];
}

/**
 * Менеджер для работы с промптами
 */
export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private promptsDir: string;
  private defaultSystemMessage: string;
  
  /**
   * Конструктор
   * @param promptsDir - Директория с шаблонами промптов
   * @param defaultSystemMessage - Системное сообщение по умолчанию
   */
  constructor(promptsDir?: string, defaultSystemMessage?: string) {
    this.promptsDir = promptsDir || process.env.PROMPTS_DIR || './prompts';
    this.defaultSystemMessage = defaultSystemMessage || 
      process.env.DEFAULT_SYSTEM_MESSAGE || 
      'Ты AI-ассистент, помогающий с дизайном интерфейсов.';
    
    // Загружаем шаблоны при создании
    this.loadTemplates();
  }
  
  /**
   * Загрузить шаблоны из директории
   */
  private loadTemplates(): void {
    try {
      // Проверяем, существует ли директория
      if (!fs.existsSync(this.promptsDir)) {
        logger.warn(`Prompts directory not found: ${this.promptsDir}`);
        return;
      }
      
      // Получаем список файлов в директории
      const files = fs.readdirSync(this.promptsDir)
        .filter(file => file.endsWith('.json') || file.endsWith('.prompt.json'));
      
      // Загружаем каждый файл
      for (const file of files) {
        try {
          const filePath = path.join(this.promptsDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const template = JSON.parse(content) as PromptTemplate;
          
          if (template.id && template.template) {
            this.templates.set(template.id, template);
            logger.debug(`Loaded prompt template: ${template.id}`);
          } else {
            logger.warn(`Invalid prompt template in file ${file}: missing required fields`);
          }
        } catch (error) {
          logger.error(`Error loading prompt template from file ${file}`, error);
        }
      }
      
      logger.info(`Loaded ${this.templates.size} prompt templates`);
    } catch (error) {
      logger.error('Error loading prompt templates', error);
    }
  }
  
  /**
   * Добавить шаблон промпта
   * @param template - Шаблон промпта
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
    logger.debug(`Added prompt template: ${template.id}`);
  }
  
  /**
   * Получить шаблон промпта по ID
   * @param id - ID шаблона
   * @returns Шаблон промпта или undefined, если не найден
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }
  
  /**
   * Получить все доступные шаблоны
   * @returns Массив шаблонов
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Заполнить шаблон данными
   * @param templateId - ID шаблона
   * @param params - Параметры заполнения
   * @returns Заполненный шаблон
   */
  fillTemplate(templateId: string, params: FillTemplateParams): FilledTemplate {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`Prompt template not found: ${templateId}`);
    }
    
    return this.fillTemplateContent(template, params);
  }
  
  /**
   * Заполнить произвольный шаблон данными
   * @param template - Шаблон промпта или текст шаблона
   * @param params - Параметры заполнения
   * @returns Заполненный шаблон
   */
  fillTemplateContent(template: string | PromptTemplate, params: FillTemplateParams): FilledTemplate {
    const warnings: string[] = [];
    const variables: Record<string, any> = {};
    
    // Получаем текст шаблона и системное сообщение
    let templateText: string;
    let systemMessage: string | undefined;
    let templateVars: string[] | PromptVariable[] = [];
    let defaultParams: Record<string, any> = {};
    
    if (typeof template === 'string') {
      templateText = template;
      systemMessage = params.includeSystemMessage ? this.defaultSystemMessage : undefined;
    } else {
      templateText = template.template;
      systemMessage = params.includeSystemMessage && template.systemMessage 
        ? template.systemMessage 
        : (params.includeSystemMessage ? this.defaultSystemMessage : undefined);
      templateVars = template.variables;
      defaultParams = template.defaultParams || {};
    }
    
    // Объединяем данные со значениями по умолчанию
    const data = params.useDefaults
      ? { ...defaultParams, ...params.data }
      : params.data;
    
    // Заполняем шаблон
    let filledText = templateText;
    
    // Получаем имена переменных из шаблона
    const variableMatches = templateText.match(/\{\{([^}]+)\}\}/g) || [];
    const variableNames = variableMatches.map(match => match.slice(2, -2).trim());
    
    // Проверяем наличие всех переменных
    for (const varName of variableNames) {
      if (data[varName] !== undefined) {
        // Заменяем переменную на значение
        const value = String(data[varName]);
        filledText = filledText.replace(new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'), value);
        variables[varName] = value;
      } else {
        // Обрабатываем отсутствующую переменную
        if (params.ignoreAbsent) {
          // Заменяем на пустую строку
          filledText = filledText.replace(new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'), '');
          warnings.push(`Variable "${varName}" is missing and was replaced with empty string`);
        } else {
          // Добавляем предупреждение
          warnings.push(`Variable "${varName}" is missing in template data`);
        }
      }
    }
    
    return {
      prompt: filledText,
      systemMessage,
      variables,
      warnings,
    };
  }
  
  /**
   * Сохранить шаблон в файл
   * @param template - Шаблон промпта
   * @returns Путь к сохраненному файлу
   */
  saveTemplate(template: PromptTemplate): string {
    try {
      // Проверяем, существует ли директория
      if (!fs.existsSync(this.promptsDir)) {
        fs.mkdirSync(this.promptsDir, { recursive: true });
        logger.info(`Created prompts directory: ${this.promptsDir}`);
      }
      
      // Формируем имя файла
      const fileName = `${template.id}.prompt.json`;
      const filePath = path.join(this.promptsDir, fileName);
      
      // Сохраняем шаблон
      fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
      logger.info(`Saved prompt template to ${filePath}`);
      
      // Добавляем шаблон в память
      this.addTemplate(template);
      
      return filePath;
    } catch (error) {
      logger.error(`Error saving prompt template ${template.id}`, error);
      throw new Error(`Failed to save prompt template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Создать экземпляр PromptManager из конфигурации
   * @returns Экземпляр PromptManager
   */
  static fromConfig(): PromptManager {
    return new PromptManager(
      process.env.PROMPTS_DIR || './prompts',
      process.env.DEFAULT_SYSTEM_MESSAGE || 'Ты AI-ассистент, помогающий с дизайном интерфейсов.'
    );
  }
} 