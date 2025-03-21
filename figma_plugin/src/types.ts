// Определение глобальной переменной __html__
declare const __html__: string;

// Определение глобального объекта figma
declare global {
  interface MessageEventHandler {
    (pluginMessage: any): void;
  }

  interface UIAPI {
    show(): void;
    hide(): void;
    resize(width: number, height: number): void;
    close(): void;
    postMessage(pluginMessage: any, options?: UIPostMessageOptions): void;
    onmessage: MessageEventHandler | undefined;
  }

  interface ClientStorageAPI {
    getAsync(key: string): Promise<any>;
    setAsync(key: string, value: any): Promise<void>;
  }

  interface PageNode extends BaseNode {
    readonly selection: ReadonlyArray<SceneNode>;
    readonly children: ReadonlyArray<SceneNode>;
  }

  interface DocumentNode {
    readonly children: ReadonlyArray<PageNode>;
    readonly currentPage: PageNode;
  }

  interface PluginAPI {
    readonly clientStorage: ClientStorageAPI;
    readonly currentPage: PageNode;
    readonly currentUser: User | null;
    readonly root: DocumentNode;
    readonly ui: UIAPI;
    readonly viewport: ViewportAPI;

    closePlugin(message?: string): void;
    getNodeById(id: string): BaseNode | null;
    notify(message: string, options?: NotificationOptions): void;
    on(type: 'selectionchange' | 'currentpagechange' | 'close' | 'timerstart' | 'timerstop' | 'timerpause' | 'timerresume', callback: () => void): void;
    once(type: 'run' | 'drop', callback: () => void): void;
    showUI(html: string, options?: ShowUIOptions): void;
    createRectangle(): RectangleNode;
    createText(): TextNode;
    createFrame(): FrameNode;
  }

  interface UIPostMessageOptions {
    origin?: string;
  }

  const figma: PluginAPI;
}

// Определения типов для Figma API
type SceneNode = FrameNode | RectangleNode | TextNode;
type NodeType = 'FRAME' | 'RECTANGLE' | 'TEXT';

// Базовый интерфейс для узлов Figma
interface BaseNode {
    id: string;
    name: string;
    type: NodeType;
    visible?: boolean;
    locked?: boolean;
    remove: () => void;
    x: number;
    y: number;
    width: number;
    height: number;
    parent: BaseNode | null;
    children?: BaseNode[];
}

// Интерфейс для FrameNode
interface FrameNode extends BaseNode {
    type: 'FRAME';
    fills: Paint[];
    strokes: Paint[];
    effects: Effect[];
    children: SceneNode[];
}

// Интерфейс для RectangleNode
interface RectangleNode extends BaseNode {
    type: 'RECTANGLE';
    x: number;
    y: number;
    width: number;
    height: number;
    fills: Paint[];
    strokes: Paint[];
    effects: Effect[];
    resize: (width: number, height: number) => void;
}

// Интерфейс для TextNode
interface TextNode extends BaseNode {
    type: 'TEXT';
    x: number;
    y: number;
    width: number;
    height: number;
    fills: Paint[];
    strokes: Paint[];
    effects: Effect[];
    characters: string;
    resize: (width: number, height: number) => void;
}

// Типы для сервера
export interface ServerSettings {
    serverUrl: string;
    apiKey?: string;
}

// Типы для Figma API (упрощенные)
export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    visible?: boolean;
    locked?: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    fills: Paint[];
    strokes: Paint[];
    effects: Effect[];
    characters?: string;
    resize: (width: number, height: number) => void;
    remove: () => void;
}

export interface Paint {
    type: string;
    color?: RGB;
    opacity?: number;
    visible?: boolean;
}

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface Effect {
    type: string;
    visible?: boolean;
    color?: RGB;
    offset?: Vector;
    radius?: number;
    spread?: number;
}

export interface Vector {
    x: number;
    y: number;
}

// Типы для WebSocket сообщений
export interface WebSocketMessage {
    type: string;
    payload: any;
}

export interface UpdateNodePayload {
    nodeId: string;
    updates: {
        fills?: Paint[];
        strokes?: Paint[];
        effects?: Effect[];
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        characters?: string;
    };
}

export interface CreateNodePayload {
    type: 'RECTANGLE' | 'TEXT' | 'FRAME';
    properties?: Partial<FigmaNode>;
}

export interface DeleteNodePayload {
    nodeId: string;
}

// Типы для сообщений о выделении
export interface SelectionInfo {
    type: 'SELECTION_INFO';
    payload: {
        hasSelection: boolean;
        count: number;
        nodes: Array<{
            id: string;
            name: string;
            type: string;
            visible: boolean;
            locked: boolean;
        }>;
    };
}

// Типы для ответов сервера
export interface ServerResponse {
    type: string;
    payload: any;
}

// Типы для логирования
export interface LogEntry {
    timestamp: string;
    level: 'info' | 'success' | 'error' | 'warning';
    message: string;
}

interface ViewportAPI {
  center: Vector;
  zoom: number;
  scrollAndZoomIntoView(nodes: ReadonlyArray<BaseNode>): void;
}

interface User {
  id: string;
  name: string;
  photoUrl: string;
}

interface ShowUIOptions {
  visible?: boolean;
  width?: number;
  height?: number;
  position?: { x: number; y: number };
}

interface NotificationOptions {
  timeout?: number;
  error?: boolean;
}

interface AutoLayoutMixin {
    layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL";
    primaryAxisSizingMode: "FIXED" | "AUTO";
    counterAxisSizingMode: "FIXED" | "AUTO";
    primaryAxisAlignItems: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
    counterAxisAlignItems: "MIN" | "CENTER" | "MAX";
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    itemSpacing: number;
    layoutGrids: LayoutGrid[];
    clipsContent: boolean;
}

interface LayoutGrid {
    pattern: "GRID" | "COLUMNS" | "ROWS";
    sectionSize: number;
    visible: boolean;
    color: RGB;
} 