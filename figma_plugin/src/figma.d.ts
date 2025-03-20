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
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fills: Paint[];
    strokes: Paint[];
    effects: Effect[];
    resize: (width: number, height: number) => void;
    remove: () => void;
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
}

interface FontName {
    family: string;
    style: string;
}

interface Paint {
    type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_DIAMOND' | 'GRADIENT_ANGULAR' | 'IMAGE';
    color?: RGB;
    opacity?: number;
    visible?: boolean;
    gradientTransform?: Transform;
    gradientStops?: ColorStop[];
    imageHash?: string;
    imageTransform?: Transform;
    scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
}

interface RGB {
    r: number;
    g: number;
    b: number;
}

interface Effect {
    type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    visible: boolean;
    color?: RGB;
    offset?: Vector;
    radius: number;
    spread?: number;
}

interface Vector {
    x: number;
    y: number;
}

interface Transform {
    matrix: number[][];
}

interface ColorStop {
    position: number;
    color: RGB;
} 