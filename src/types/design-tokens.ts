/**
 * Типы для работы с дизайн-токенами
 */

/**
 * Тип токена (цвет, размер, типографика и т.д.)
 */
export enum TokenType {
  COLOR = 'color',
  SPACING = 'spacing',
  SIZE = 'size',
  TYPOGRAPHY = 'typography',
  RADIUS = 'radius',
  SHADOW = 'shadow',
  OPACITY = 'opacity',
  BORDER = 'border',
  Z_INDEX = 'z-index',
  BREAKPOINT = 'breakpoint',
  CUSTOM = 'custom'
}

/**
 * Базовый интерфейс для всех токенов
 */
export interface BaseToken {
  /** Уникальный идентификатор токена */
  id: string;
  /** Имя токена */
  name: string;
  /** Тип токена */
  type: TokenType;
  /** Описание токена */
  description?: string;
  /** Метаданные */
  meta?: Record<string, any>;
}

/**
 * Токен цвета
 */
export interface ColorToken extends BaseToken {
  type: TokenType.COLOR;
  /** Значение цвета в hex, rgba или hsla формате */
  value: string;
  /** Компоненты цвета в RGB (0-1) */
  rgb?: { r: number; g: number; b: number; a?: number };
}

/**
 * Токен размера
 */
export interface SizeToken extends BaseToken {
  type: TokenType.SIZE | TokenType.SPACING;
  /** Значение размера с единицей измерения (px, rem, em, %) */
  value: string;
  /** Числовое значение */
  rawValue: number;
  /** Единица измерения */
  unit: 'px' | 'rem' | 'em' | '%' | 'vh' | 'vw';
}

/**
 * Токен типографики
 */
export interface TypographyToken extends BaseToken {
  type: TokenType.TYPOGRAPHY;
  value: {
    /** Семейство шрифтов */
    fontFamily: string;
    /** Размер шрифта */
    fontSize: string;
    /** Насыщенность шрифта */
    fontWeight: number | string;
    /** Межстрочный интервал */
    lineHeight: string;
    /** Межбуквенный интервал */
    letterSpacing?: string;
    /** Трансформация текста */
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    /** Декорация текста */
    textDecoration?: 'none' | 'underline' | 'line-through';
  };
}

/**
 * Токен радиуса скругления
 */
export interface RadiusToken extends BaseToken {
  type: TokenType.RADIUS;
  /** Значение радиуса с единицей измерения */
  value: string;
  /** Числовое значение */
  rawValue: number;
  /** Единица измерения */
  unit: 'px' | 'rem' | 'em' | '%';
}

/**
 * Токен тени
 */
export interface ShadowToken extends BaseToken {
  type: TokenType.SHADOW;
  /** CSS-значение тени */
  value: string;
  /** Компоненты тени */
  shadow: {
    /** Смещение по X */
    x: string;
    /** Смещение по Y */
    y: string;
    /** Размытие */
    blur: string;
    /** Растяжение */
    spread: string;
    /** Цвет тени */
    color: string;
    /** Внутренняя тень */
    inset?: boolean;
  };
}

/**
 * Токен прозрачности
 */
export interface OpacityToken extends BaseToken {
  type: TokenType.OPACITY;
  /** Значение прозрачности (0-1) */
  value: number;
}

/**
 * Токен границы
 */
export interface BorderToken extends BaseToken {
  type: TokenType.BORDER;
  /** CSS-значение границы */
  value: string;
  /** Компоненты границы */
  border: {
    /** Ширина границы */
    width: string;
    /** Стиль границы */
    style: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';
    /** Цвет границы */
    color: string;
  };
}

/**
 * Токен z-index
 */
export interface ZIndexToken extends BaseToken {
  type: TokenType.Z_INDEX;
  /** Значение z-index */
  value: number;
}

/**
 * Токен точки останова (breakpoint)
 */
export interface BreakpointToken extends BaseToken {
  type: TokenType.BREAKPOINT;
  /** Значение точки останова с единицей измерения */
  value: string;
  /** Числовое значение */
  rawValue: number;
  /** Единица измерения */
  unit: 'px' | 'em' | 'rem';
}

/**
 * Пользовательский токен
 */
export interface CustomToken extends BaseToken {
  type: TokenType.CUSTOM;
  /** Значение пользовательского токена */
  value: any;
}

/**
 * Объединенный тип токена
 */
export type DesignToken =
  | ColorToken
  | SizeToken
  | TypographyToken
  | RadiusToken
  | ShadowToken
  | OpacityToken
  | BorderToken
  | ZIndexToken
  | BreakpointToken
  | CustomToken;

/**
 * Группа токенов по категории
 */
export interface TokenGroup {
  /** Имя группы */
  name: string;
  /** Описание группы */
  description?: string;
  /** Токены в группе */
  tokens: DesignToken[];
  /** Подгруппы */
  groups?: TokenGroup[];
}

/**
 * Коллекция токенов
 */
export interface TokenCollection {
  /** Имя коллекции */
  name: string;
  /** Описание коллекции */
  description?: string;
  /** Версия коллекции */
  version?: string;
  /** Группы токенов */
  groups: TokenGroup[];
}

/**
 * Формат для экспорта токенов
 */
export enum TokenExportFormat {
  CSS = 'css',
  SCSS = 'scss',
  LESS = 'less',
  JSON = 'json',
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  FIGMA = 'figma',
  SKETCH = 'sketch',
  XML = 'xml',
  YAML = 'yaml',
  CUSTOM = 'custom'
} 