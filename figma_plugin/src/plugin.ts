import { WebSocketClient } from './websocket';
import { 
    FigmaNode, 
    WebSocketMessage, 
    UpdateNodePayload, 
    CreateNodePayload, 
    DeleteNodePayload 
} from './types';

// Инициализация WebSocket клиента
const ws = new WebSocketClient();

// Состояние плагина
let isConnected = false;

// Основной файл плагина
figma.showUI(__html__, { width: 400, height: 300 });

// Обработка сообщений от UI
figma.ui.onmessage = async (msg: WebSocketMessage) => {
    if (msg.type === 'CONNECT') {
        try {
            await ws.connect();
            isConnected = true;
            figma.ui.postMessage({ type: 'CONNECTED' });
        } catch (error) {
            figma.ui.postMessage({ 
                type: 'ERROR', 
                payload: { message: 'Failed to connect to server' }
            });
        }
    }
};

// Обработка сообщений от WebSocket
ws.on('UPDATE_NODE', async (payload: UpdateNodePayload) => {
    try {
        const { nodeId, updates } = payload;
        const node = figma.getNodeById(nodeId) as FigmaNode;
        
        if (node) {
            // Обновление стилей
            if (updates.fills) {
                node.fills = updates.fills;
            }
            if (updates.strokes) {
                node.strokes = updates.strokes;
            }
            if (updates.effects) {
                node.effects = updates.effects;
            }
            
            // Обновление размеров и позиции
            if (updates.width !== undefined) {
                node.resize(updates.width, node.height);
            }
            if (updates.height !== undefined) {
                node.resize(node.width, updates.height);
            }
            if (updates.x !== undefined || updates.y !== undefined) {
                node.x = updates.x ?? node.x;
                node.y = updates.y ?? node.y;
            }
            
            // Обновление текста
            if (updates.characters && 'characters' in node) {
                node.characters = updates.characters;
            }
            
            figma.ui.postMessage({ 
                type: 'NODE_UPDATED', 
                payload: { nodeId } 
            });
        }
    } catch (error) {
        figma.ui.postMessage({ 
            type: 'ERROR', 
            payload: { message: 'Failed to update node' }
        });
    }
});

ws.on('CREATE_NODE', async (payload: CreateNodePayload) => {
    try {
        const { type, properties } = payload;
        let node: FigmaNode;
        
        switch (type) {
            case 'RECTANGLE':
                node = figma.createRectangle();
                break;
            case 'TEXT':
                node = figma.createText();
                break;
            case 'FRAME':
                node = figma.createFrame();
                break;
            default:
                throw new Error(`Unknown node type: ${type}`);
        }
        
        // Применяем свойства
        if (properties) {
            Object.assign(node, properties);
        }
        
        figma.ui.postMessage({ 
            type: 'NODE_CREATED', 
            payload: { nodeId: node.id } 
        });
    } catch (error) {
        figma.ui.postMessage({ 
            type: 'ERROR', 
            payload: { message: 'Failed to create node' }
        });
    }
});

ws.on('DELETE_NODE', async (payload: DeleteNodePayload) => {
    try {
        const { nodeId } = payload;
        const node = figma.getNodeById(nodeId);
        
        if (node) {
            node.remove();
            figma.ui.postMessage({ 
                type: 'NODE_DELETED', 
                payload: { nodeId } 
            });
        }
    } catch (error) {
        figma.ui.postMessage({ 
            type: 'ERROR', 
            payload: { message: 'Failed to delete node' }
        });
    }
});

// Функция для отправки сообщений в UI
function sendToUI(type: string, data: any) {
    figma.ui.postMessage({ type, data });
} 