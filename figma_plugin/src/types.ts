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
    createRectangle: () => FigmaNode;
    createText: () => FigmaNode;
    createFrame: () => FigmaNode;
};

// Типы для Figma API
export interface FigmaNode {
    id: string;
    type: string;
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