import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { 
  TokenType, 
  BaseToken, 
  DesignToken, 
  TokenGroup, 
  TokenCollection, 
  TokenExportFormat,
  ColorToken,
  SizeToken,
  TypographyToken,
  RadiusToken,
  ShadowToken,
  OpacityToken,
  BorderToken,
  ZIndexToken
} from '../types/design-tokens';

/**
 * Сервис для работы с дизайн-токенами
 */
export class DesignTokensService {
  private collections: Map<string, TokenCollection> = new Map();

  /**
   * Создать новую коллекцию токенов
   * @param name - Имя коллекции
   * @param description - Описание коллекции
   * @param version - Версия коллекции
   * @returns ID новой коллекции
   */
  public createCollection(name: string, description?: string, version?: string): string {
    const id = uuidv4();
    
    this.collections.set(id, {
      name,
      description,
      version,
      groups: [],
    });
    
    logger.info(`Created design token collection: ${name}`);
    return id;
  }

  /**
   * Получить коллекцию токенов по ID
   * @param collectionId - ID коллекции
   * @returns Коллекция токенов или undefined, если не найдена
   */
  public getCollection(collectionId: string): TokenCollection | undefined {
    return this.collections.get(collectionId);
  }

  /**
   * Получить все коллекции токенов
   * @returns Массив коллекций токенов
   */
  public getAllCollections(): TokenCollection[] {
    return Array.from(this.collections.values());
  }

  /**
   * Добавить группу токенов в коллекцию
   * @param collectionId - ID коллекции
   * @param groupName - Имя группы
   * @param description - Описание группы
   * @returns ID новой группы
   */
  public addGroupToCollection(collectionId: string, groupName: string, description?: string): string {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      throw new Error(`Collection with ID ${collectionId} not found`);
    }
    
    const groupId = uuidv4();
    const group: TokenGroup = {
      name: groupName,
      description,
      tokens: [],
    };
    
    collection.groups.push(group);
    logger.info(`Added token group "${groupName}" to collection "${collection.name}"`);
    
    return groupId;
  }

  /**
   * Создать новый токен
   * @param collectionId - ID коллекции
   * @param groupName - Имя группы
   * @param token - Токен для добавления
   * @returns ID нового токена
   */
  public createToken(collectionId: string, groupName: string, token: Omit<DesignToken, 'id'>): string {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      throw new Error(`Collection with ID ${collectionId} not found`);
    }
    
    // Находим группу или создаем новую
    let group = collection.groups.find(g => g.name === groupName);
    
    if (!group) {
      const groupId = this.addGroupToCollection(collectionId, groupName);
      group = collection.groups.find(g => g.name === groupName);
      
      if (!group) {
        throw new Error(`Failed to create group "${groupName}"`);
      }
    }
    
    // Создаем токен с уникальным ID
    const tokenId = uuidv4();
    
    // Создаем токен с учетом его типа
    const newToken = {
      ...token,
      id: tokenId
    } as DesignToken;
    
    group.tokens.push(newToken);
    logger.info(`Created token "${newToken.name}" in group "${groupName}"`);
    
    return tokenId;
  }

  /**
   * Получить токен по ID
   * @param collectionId - ID коллекции
   * @param tokenId - ID токена
   * @returns Токен или undefined, если не найден
   */
  public getTokenById(collectionId: string, tokenId: string): DesignToken | undefined {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      return undefined;
    }
    
    // Поиск токена в группах
    for (const group of collection.groups) {
      const token = group.tokens.find(t => t.id === tokenId);
      if (token) {
        return token;
      }
    }
    
    return undefined;
  }

  /**
   * Получить токены по имени
   * @param collectionId - ID коллекции
   * @param tokenName - Имя токена
   * @returns Массив токенов с указанным именем
   */
  public getTokensByName(collectionId: string, tokenName: string): DesignToken[] {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      return [];
    }
    
    const result: DesignToken[] = [];
    
    // Поиск токена в группах
    for (const group of collection.groups) {
      const tokens = group.tokens.filter(t => t.name === tokenName);
      result.push(...tokens);
    }
    
    return result;
  }

  /**
   * Получить токены по типу
   * @param collectionId - ID коллекции
   * @param tokenType - Тип токена
   * @returns Массив токенов указанного типа
   */
  public getTokensByType(collectionId: string, tokenType: TokenType): DesignToken[] {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      return [];
    }
    
    const result: DesignToken[] = [];
    
    // Поиск токена в группах
    for (const group of collection.groups) {
      const tokens = group.tokens.filter(t => t.type === tokenType);
      result.push(...tokens);
    }
    
    return result;
  }

  /**
   * Обновить токен
   * @param collectionId - ID коллекции
   * @param tokenId - ID токена
   * @param updates - Обновления для токена
   * @returns Обновленный токен или undefined, если не найден
   */
  public updateToken(
    collectionId: string, 
    tokenId: string, 
    updates: Partial<Omit<DesignToken, 'id' | 'type'>>
  ): DesignToken | undefined {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      return undefined;
    }
    
    // Поиск и обновление токена
    for (const group of collection.groups) {
      const tokenIndex = group.tokens.findIndex(t => t.id === tokenId);
      
      if (tokenIndex >= 0) {
        const token = group.tokens[tokenIndex];
        
        // Обновляем токен (без изменения id и type)
        const updatedToken = {
          ...token,
          ...updates,
          id: token.id,
          type: token.type
        } as DesignToken;
        
        group.tokens[tokenIndex] = updatedToken;
        logger.info(`Updated token "${updatedToken.name}" (${tokenId})`);
        
        return updatedToken;
      }
    }
    
    return undefined;
  }

  /**
   * Удалить токен
   * @param collectionId - ID коллекции
   * @param tokenId - ID токена
   * @returns true, если токен удален, иначе false
   */
  public deleteToken(collectionId: string, tokenId: string): boolean {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      return false;
    }
    
    // Поиск и удаление токена
    for (const group of collection.groups) {
      const tokenIndex = group.tokens.findIndex(t => t.id === tokenId);
      
      if (tokenIndex >= 0) {
        const token = group.tokens[tokenIndex];
        group.tokens.splice(tokenIndex, 1);
        logger.info(`Deleted token "${token.name}" (${tokenId})`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Экспортировать коллекцию токенов в указанный формат
   * @param collectionId - ID коллекции
   * @param format - Формат экспорта
   * @returns Строка с токенами в указанном формате
   */
  public exportTokens(collectionId: string, format: TokenExportFormat): string {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      throw new Error(`Collection with ID ${collectionId} not found`);
    }
    
    switch (format) {
      case TokenExportFormat.JSON:
        return this.exportToJSON(collection);
      case TokenExportFormat.CSS:
        return this.exportToCSS(collection);
      case TokenExportFormat.SCSS:
        return this.exportToSCSS(collection);
      case TokenExportFormat.TYPESCRIPT:
        return this.exportToTypeScript(collection);
      case TokenExportFormat.JAVASCRIPT:
        return this.exportToJavaScript(collection);
      default:
        throw new Error(`Export format "${format}" not supported`);
    }
  }

  /**
   * Импортировать токены из JSON-строки
   * @param json - JSON-строка с токенами
   * @returns ID новой коллекции
   */
  public importFromJSON(json: string): string {
    try {
      const data = JSON.parse(json);
      
      // Проверяем формат данных
      if (!data.name || !Array.isArray(data.groups)) {
        throw new Error('Invalid token collection format');
      }
      
      // Создаем новую коллекцию
      const collectionId = this.createCollection(data.name, data.description, data.version);
      const collection = this.collections.get(collectionId);
      
      if (!collection) {
        throw new Error('Failed to create collection');
      }
      
      // Добавляем группы с токенами
      for (const groupData of data.groups) {
        const group: TokenGroup = {
          name: groupData.name,
          description: groupData.description,
          tokens: [],
        };
        
        // Добавляем токены в группу
        if (Array.isArray(groupData.tokens)) {
          for (const tokenData of groupData.tokens) {
            if (tokenData.name && tokenData.type) {
              // Создаем уникальный ID для токена
              tokenData.id = tokenData.id || uuidv4();
              group.tokens.push(tokenData as DesignToken);
            }
          }
        }
        
        collection.groups.push(group);
      }
      
      logger.info(`Imported token collection "${data.name}" with ${this.countAllTokens(collectionId)} tokens`);
      return collectionId;
    } catch (error) {
      logger.error('Failed to import tokens from JSON', error);
      throw new Error(`Failed to import tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Получить количество токенов в коллекции
   * @param collectionId - ID коллекции
   * @returns Количество токенов
   */
  public countAllTokens(collectionId: string): number {
    const collection = this.collections.get(collectionId);
    
    if (!collection) {
      return 0;
    }
    
    return collection.groups.reduce((count, group) => count + group.tokens.length, 0);
  }

  // Приватные методы для экспорта токенов в разные форматы

  /**
   * Экспорт токенов в JSON
   * @param collection - Коллекция токенов
   * @returns JSON-строка
   */
  private exportToJSON(collection: TokenCollection): string {
    return JSON.stringify(collection, null, 2);
  }

  /**
   * Экспорт токенов в CSS
   * @param collection - Коллекция токенов
   * @returns CSS-строка
   */
  private exportToCSS(collection: TokenCollection): string {
    let css = `/**\n * Design Tokens: ${collection.name}\n`;
    
    if (collection.description) {
      css += ` * ${collection.description}\n`;
    }
    
    if (collection.version) {
      css += ` * Version: ${collection.version}\n`;
    }
    
    css += ' */\n\n:root {\n';
    
    // Добавляем токены
    for (const group of collection.groups) {
      css += `  /* ${group.name} */\n`;
      
      for (const token of group.tokens) {
        let variableValue = '';
        
        switch (token.type) {
          case TokenType.COLOR:
            variableValue = (token as ColorToken).value;
            break;
          case TokenType.SIZE:
          case TokenType.SPACING:
          case TokenType.RADIUS:
            variableValue = (token as SizeToken).value;
            break;
          case TokenType.TYPOGRAPHY:
            // Пропускаем типографику - она не поддерживается напрямую в CSS переменных
            continue;
          case TokenType.SHADOW:
            variableValue = (token as ShadowToken).value;
            break;
          case TokenType.OPACITY:
            variableValue = String((token as OpacityToken).value);
            break;
          case TokenType.BORDER:
            variableValue = (token as BorderToken).value;
            break;
          case TokenType.Z_INDEX:
            variableValue = String((token as ZIndexToken).value);
            break;
          default:
            // Для сложных или нестандартных типов токенов пропускаем
            continue;
        }
        
        css += `  --${this.kebabCase(token.name)}: ${variableValue};\n`;
      }
      
      css += '\n';
    }
    
    css += '}\n';
    return css;
  }

  /**
   * Экспорт токенов в SCSS
   * @param collection - Коллекция токенов
   * @returns SCSS-строка
   */
  private exportToSCSS(collection: TokenCollection): string {
    let scss = `// Design Tokens: ${collection.name}\n`;
    
    if (collection.description) {
      scss += `// ${collection.description}\n`;
    }
    
    if (collection.version) {
      scss += `// Version: ${collection.version}\n`;
    }
    
    scss += '\n';
    
    // Добавляем токены по группам
    for (const group of collection.groups) {
      scss += `// ${group.name}\n`;
      
      for (const token of group.tokens) {
        let variableName = this.kebabCase(token.name);
        let variableValue = '';
        
        switch (token.type) {
          case TokenType.COLOR:
            variableValue = (token as ColorToken).value;
            break;
          case TokenType.SIZE:
          case TokenType.SPACING:
          case TokenType.RADIUS:
            variableValue = (token as SizeToken).value;
            break;
          case TokenType.TYPOGRAPHY:
            // Для типографики создаем миксин
            scss += this.createSCSSTypographyMixin(token as TypographyToken);
            continue;
          case TokenType.SHADOW:
            variableValue = (token as ShadowToken).value;
            break;
          case TokenType.OPACITY:
            variableValue = String((token as OpacityToken).value);
            break;
          case TokenType.BORDER:
            variableValue = (token as BorderToken).value;
            break;
          case TokenType.Z_INDEX:
            variableValue = String((token as ZIndexToken).value);
            break;
          default:
            // Для сложных или нестандартных типов токенов пропускаем
            continue;
        }
        
        scss += `$${variableName}: ${variableValue};\n`;
      }
      
      scss += '\n';
    }
    
    return scss;
  }

  /**
   * Экспорт токенов в TypeScript
   * @param collection - Коллекция токенов
   * @returns TypeScript-строка
   */
  private exportToTypeScript(collection: TokenCollection): string {
    let ts = `/**\n * Design Tokens: ${collection.name}\n`;
    
    if (collection.description) {
      ts += ` * ${collection.description}\n`;
    }
    
    if (collection.version) {
      ts += ` * Version: ${collection.version}\n`;
    }
    
    ts += ' */\n\n';
    
    // Создаем пространства имен для каждой группы токенов
    for (const group of collection.groups) {
      const namespaceTokens: string[] = [];
      
      for (const token of group.tokens) {
        const camelCaseName = this.camelCase(token.name);
        let tokenValue = '';
        
        switch (token.type) {
          case TokenType.COLOR:
            tokenValue = `'${(token as ColorToken).value}'`;
            break;
          case TokenType.SIZE:
          case TokenType.SPACING:
          case TokenType.RADIUS:
            tokenValue = `'${(token as SizeToken).value}'`;
            break;
          case TokenType.TYPOGRAPHY:
            tokenValue = this.createTypeScriptTypographyObject(token as TypographyToken);
            break;
          case TokenType.SHADOW:
            tokenValue = `'${(token as ShadowToken).value}'`;
            break;
          case TokenType.OPACITY:
            tokenValue = String((token as OpacityToken).value);
            break;
          case TokenType.BORDER:
            tokenValue = `'${(token as BorderToken).value}'`;
            break;
          case TokenType.Z_INDEX:
            tokenValue = String((token as ZIndexToken).value);
            break;
          default:
            // Для сложных или нестандартных типов токенов используем JSON.stringify
            tokenValue = JSON.stringify(token.value);
        }
        
        namespaceTokens.push(`  export const ${camelCaseName} = ${tokenValue};`);
      }
      
      if (namespaceTokens.length > 0) {
        // Создаем пространство имен для группы
        const pascalCaseGroupName = this.pascalCase(group.name);
        ts += `export namespace ${pascalCaseGroupName} {\n`;
        ts += namespaceTokens.join('\n');
        ts += '\n}\n\n';
      }
    }
    
    return ts;
  }

  /**
   * Экспорт токенов в JavaScript
   * @param collection - Коллекция токенов
   * @returns JavaScript-строка
   */
  private exportToJavaScript(collection: TokenCollection): string {
    let js = `/**\n * Design Tokens: ${collection.name}\n`;
    
    if (collection.description) {
      js += ` * ${collection.description}\n`;
    }
    
    if (collection.version) {
      js += ` * Version: ${collection.version}\n`;
    }
    
    js += ' */\n\n';
    
    // Создаем объекты для каждой группы токенов
    for (const group of collection.groups) {
      const groupTokens: string[] = [];
      
      for (const token of group.tokens) {
        const camelCaseName = this.camelCase(token.name);
        let tokenValue = '';
        
        switch (token.type) {
          case TokenType.COLOR:
            tokenValue = `'${(token as ColorToken).value}'`;
            break;
          case TokenType.SIZE:
          case TokenType.SPACING:
          case TokenType.RADIUS:
            tokenValue = `'${(token as SizeToken).value}'`;
            break;
          case TokenType.TYPOGRAPHY:
            tokenValue = this.createJavaScriptTypographyObject(token as TypographyToken);
            break;
          case TokenType.SHADOW:
            tokenValue = `'${(token as ShadowToken).value}'`;
            break;
          case TokenType.OPACITY:
            tokenValue = String((token as OpacityToken).value);
            break;
          case TokenType.BORDER:
            tokenValue = `'${(token as BorderToken).value}'`;
            break;
          case TokenType.Z_INDEX:
            tokenValue = String((token as ZIndexToken).value);
            break;
          default:
            // Для сложных или нестандартных типов токенов используем JSON.stringify
            tokenValue = JSON.stringify(token.value);
        }
        
        groupTokens.push(`  ${camelCaseName}: ${tokenValue},`);
      }
      
      if (groupTokens.length > 0) {
        // Создаем объект для группы
        const camelCaseGroupName = this.camelCase(group.name);
        js += `export const ${camelCaseGroupName} = {\n`;
        js += groupTokens.join('\n');
        js += '\n};\n\n';
      }
    }
    
    return js;
  }

  /**
   * Создание SCSS-миксина для типографики
   * @param token - Токен типографики
   * @returns SCSS-миксин
   */
  private createSCSSTypographyMixin(token: TypographyToken): string {
    const { value } = token;
    const mixinName = this.kebabCase(token.name);
    
    let mixin = `@mixin ${mixinName} {\n`;
    mixin += `  font-family: ${value.fontFamily};\n`;
    mixin += `  font-size: ${value.fontSize};\n`;
    mixin += `  font-weight: ${value.fontWeight};\n`;
    mixin += `  line-height: ${value.lineHeight};\n`;
    
    if (value.letterSpacing) {
      mixin += `  letter-spacing: ${value.letterSpacing};\n`;
    }
    
    if (value.textTransform && value.textTransform !== 'none') {
      mixin += `  text-transform: ${value.textTransform};\n`;
    }
    
    if (value.textDecoration && value.textDecoration !== 'none') {
      mixin += `  text-decoration: ${value.textDecoration};\n`;
    }
    
    mixin += `}\n\n`;
    return mixin;
  }

  /**
   * Создание TypeScript-объекта для типографики
   * @param token - Токен типографики
   * @returns TypeScript-объект
   */
  private createTypeScriptTypographyObject(token: TypographyToken): string {
    const { value } = token;
    const properties = [];
    
    properties.push(`fontFamily: '${value.fontFamily}'`);
    properties.push(`fontSize: '${value.fontSize}'`);
    properties.push(`fontWeight: ${typeof value.fontWeight === 'number' ? value.fontWeight : `'${value.fontWeight}'`}`);
    properties.push(`lineHeight: '${value.lineHeight}'`);
    
    if (value.letterSpacing) {
      properties.push(`letterSpacing: '${value.letterSpacing}'`);
    }
    
    if (value.textTransform) {
      properties.push(`textTransform: '${value.textTransform}'`);
    }
    
    if (value.textDecoration) {
      properties.push(`textDecoration: '${value.textDecoration}'`);
    }
    
    return `{\n    ${properties.join(',\n    ')}\n  }`;
  }

  /**
   * Создание JavaScript-объекта для типографики
   * @param token - Токен типографики
   * @returns JavaScript-объект
   */
  private createJavaScriptTypographyObject(token: TypographyToken): string {
    const { value } = token;
    const properties = [];
    
    properties.push(`fontFamily: '${value.fontFamily}'`);
    properties.push(`fontSize: '${value.fontSize}'`);
    properties.push(`fontWeight: ${typeof value.fontWeight === 'number' ? value.fontWeight : `'${value.fontWeight}'`}`);
    properties.push(`lineHeight: '${value.lineHeight}'`);
    
    if (value.letterSpacing) {
      properties.push(`letterSpacing: '${value.letterSpacing}'`);
    }
    
    if (value.textTransform) {
      properties.push(`textTransform: '${value.textTransform}'`);
    }
    
    if (value.textDecoration) {
      properties.push(`textDecoration: '${value.textDecoration}'`);
    }
    
    return `{\n    ${properties.join(',\n    ')}\n  }`;
  }

  /**
   * Преобразование строки в kebab-case
   * @param str - Исходная строка
   * @returns Строка в kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  /**
   * Преобразование строки в camelCase
   * @param str - Исходная строка
   * @returns Строка в camelCase
   */
  private camelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => 
        index === 0 ? letter.toLowerCase() : letter.toUpperCase()
      )
      .replace(/\s+|[_-]/g, '');
  }

  /**
   * Преобразование строки в PascalCase
   * @param str - Исходная строка
   * @returns Строка в PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, letter => letter.toUpperCase())
      .replace(/\s+|[_-]/g, '');
  }
} 