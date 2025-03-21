// Определение глобальной переменной __html__
declare const __html__: string;

// Определение глобального объекта figma
declare const figma: {
    showUI: (html: string, options: { width: number; height: number }) => void;
    ui: {
        postMessage: (message: any) => void;
        onmessage: (callback: (message: any) => void) => void;
    };
    getNodeById: (id: string) => FigmaNode | null;
    createRectangle: () => RectangleNode;
    createText: () => TextNode;
    createFrame: () => FrameNode;
};

// Базовый интерфейс для всех узлов Figma
interface FigmaNode {
    id: string;
    name: string;
    type: string;
    visible: boolean;
    locked: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    fills?: Paint[];
    strokes?: Paint[];
    effects?: Effect[];
    remove(): void;
}

// Типы для свойств
interface Paint {
    type: string;
    visible: boolean;
    opacity: number;
    blendMode: string;
    color?: { r: number; g: number; b: number };
    boundVariables?: any;
}

interface Effect {
    type: string;
    visible: boolean;
    radius: number;
    color: { r: number; g: number; b: number; a: number };
}

interface FontName {
    family: string;
    style: string;
}

// Специфические типы узлов
interface RectangleNode extends FigmaNode {
    type: 'RECTANGLE';
    cornerRadius: number;
}

interface TextNode extends FigmaNode {
    type: 'TEXT';
    characters: string;
    fontSize: number;
    fontName: FontName;
    textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical: 'TOP' | 'CENTER' | 'BOTTOM';
}

interface FrameNode extends FigmaNode {
    type: 'FRAME';
    clipsContent: boolean;
    layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    primaryAxisSizingMode: 'FIXED' | 'AUTO';
    counterAxisSizingMode: 'FIXED' | 'AUTO';
    primaryAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
    counterAxisAlignItems: 'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN';
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    itemSpacing: number;
    children: FigmaNode[];
}

// Глобальный объект figma
declare global {
    interface PluginAPI {
        showUI(html: string, options: { width: number; height: number }): void;
        ui: {
            postMessage(message: any): void;
            onmessage: ((message: any) => void) | null;
        };
        clientStorage: {
            getAsync(key: string): Promise<any>;
            setAsync(key: string, value: any): Promise<void>;
        };
        currentPage: {
            selection: FigmaNode[];
        };
        on(event: string, callback: () => void): void;
        getNodeById(id: string): FigmaNode | null;
        createRectangle(): RectangleNode;
        createText(): TextNode;
        createFrame(): FrameNode;
    }

    var figma: PluginAPI;
} 