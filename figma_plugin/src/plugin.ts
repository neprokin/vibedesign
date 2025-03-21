import { 
    FigmaNode, 
    WebSocketMessage, 
    ServerSettings,
    LogEntry
} from './types';

// Настройки по умолчанию
const DEFAULT_SETTINGS: ServerSettings = {
  serverUrl: "ws://localhost:8767"
};

// Состояние плагина
let isConnected = false;
let serverSettings = DEFAULT_SETTINGS;
let logEntries: LogEntry[] = [];

// Максимальное количество сохраняемых логов
const MAX_LOGS = 1000;

// Загрузка настроек из локального хранилища
const loadSettings = async () => {
  try {
    const settings = await figma.clientStorage.getAsync('serverSettings');
    if (settings) {
      serverSettings = { ...DEFAULT_SETTINGS, ...settings };
    }
    return serverSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

// Сохранение настроек в локальное хранилище
const saveSettings = async (settings: Partial<ServerSettings>) => {
  try {
    serverSettings = { ...serverSettings, ...settings };
    await figma.clientStorage.setAsync('serverSettings', serverSettings);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

// Функция для рекурсивного получения всего дерева начиная с указанного узла
function getSceneTree(node: any): any {
  console.log(`Getting scene tree for ${node.name} (${node.type})`);
  
  // Базовая информация о узле
  const nodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  };
  
  // Специфические свойства в зависимости от типа узла
  if (node.type === 'TEXT') {
    nodeInfo['text'] = {
      characters: node.characters,
      fontSize: node.fontSize,
      fontName: node.fontName,
      textAlignHorizontal: node.textAlignHorizontal,
      textAlignVertical: node.textAlignVertical
    };
  }
  
  if ('fills' in node) {
    nodeInfo['fills'] = node.fills;
  }
  
  if ('strokes' in node) {
    nodeInfo['strokes'] = node.strokes;
  }
  
  if ('effects' in node) {
    nodeInfo['effects'] = node.effects;
  }
  
  // Auto Layout свойства (если узел является фреймом с Auto Layout)
  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    nodeInfo['autoLayout'] = {
      layoutMode: node.layoutMode,
      primaryAxisSizingMode: node.primaryAxisSizingMode,
      counterAxisSizingMode: node.counterAxisSizingMode,
      primaryAxisAlignItems: node.primaryAxisAlignItems,
      counterAxisAlignItems: node.counterAxisAlignItems,
      padding: {
        top: node.paddingTop,
        right: node.paddingRight,
        bottom: node.paddingBottom,
        left: node.paddingLeft
      },
      itemSpacing: node.itemSpacing,
      clipsContent: node.clipsContent
    };
  }
  
  // Дочерние элементы (только если они есть и доступны через API)
  if ('children' in node && node.children && node.children.length > 0) {
    console.log(`Node ${node.name} has ${node.children.length} children`);
    nodeInfo['children'] = [];
    
    try {
      // Рекурсивно получаем информацию о дочерних элементах
      for (const child of node.children) {
        nodeInfo['children'].push(getSceneTree(child));
      }
    } catch (error) {
      console.error(`Error processing children for ${node.name}:`, error);
    }
  }
  
  return nodeInfo;
}

// Функция для получения информации о выбранных элементах
const getSelectionInfo = async () => {
  const selection = figma.currentPage.selection;
  
  console.log("SELECTION DETAILS:", JSON.stringify({
    selectionCount: selection.length,
    selectionTypes: selection.map(node => node.type),
    hasChildren: selection.map(node => 'children' in node)
  }));
  
  if (selection.length === 0) {
    return { 
      hasSelection: false,
      count: 0,
      nodes: []
    };
  }
  
  if (selection.length > 0) {
    const node = selection[0];
    console.log("FIRST SELECTED NODE DETAILS:", {
      name: node.name,
      type: node.type,
      hasChildren: 'children' in node,
      childrenLength: 'children' in node ? node.children.length : 0,
      childrenTypes: 'children' in node ? node.children.map((c: any) => c.type) : [],
      hasLayoutMode: 'layoutMode' in node,
      layoutMode: 'layoutMode' in node ? node.layoutMode : 'NONE',
      nodeProps: Object.keys(node)
    });
    
    // Проверим доступ к дочерним элементам напрямую
    try {
      if ('children' in node) {
        // Попробуем получить доступ напрямую
        console.log("DIRECT CHILDREN ACCESS RESULT:", 
          node.children.map((child: any) => ({
            name: child.name,
            type: child.type,
            id: child.id
          }))
        );
      } else {
        console.log("DIRECT CHILDREN ACCESS: No children property found");
      }
    } catch (error) {
      console.error("DIRECT CHILDREN ACCESS ERROR:", error);
    }
  }
  
  // Получаем полную информацию о выбранных элементах, включая дерево дочерних элементов
  const nodes = selection.map(node => {
    // Пробуем получить дочерние элементы другими способами
    console.log(`Analyzing node ${node.name} with type ${node.type}`);
    
    // Попробуем вывести все свойства объекта для дополнительной информации
    for (const prop in node) {
      try {
        if (typeof node[prop] !== 'function') {
          console.log(`Property ${prop}: ${JSON.stringify(node[prop])}`);
        }
      } catch (e) {
        console.log(`Property ${prop}: [Error accessing value]`);
      }
    }
    
    return getSceneTree(node);
  });
  
  return { 
    hasSelection: true,
    count: selection.length,
    nodes
  };
};

// Отправка сообщения о выделении при его изменении
figma.on('selectionchange', async () => {
  try {
    console.log("Selection changed, collecting full tree data...");
    const selectionData = await getSelectionInfo();
    
    // Отправляем полные данные, включая всё дерево дочерних элементов
    figma.ui.postMessage({ 
      type: 'SELECTION_CHANGED', 
      payload: selectionData
    });
    
    // Логируем количество найденных дочерних элементов для отладки
    if (selectionData.hasSelection && selectionData.nodes.length > 0) {
      const firstNode = selectionData.nodes[0];
      const childrenCount = firstNode.children ? firstNode.children.length : 0;
      console.log(`Selection data sent with ${childrenCount} children in the first node`);
    }
  } catch (error) {
    console.error("Error in selectionchange handler:", error);
    figma.ui.postMessage({ 
      type: 'ERROR', 
      payload: { message: 'Failed to process selection: ' + (error instanceof Error ? error.message : String(error)) }
    });
  }
});

// Основной файл плагина
figma.showUI(__html__, { width: 450, height: 650 });

// Обработка сообщений от UI
figma.ui.onmessage = async (msg: any) => {
  console.log('Message received from UI:', msg);
  
  switch (msg.type) {
    case 'UI_LOADED':
      // UI успешно загружен
      console.log('UI loaded');
      
      // Отправить текущие сохраненные логи обратно в UI
      try {
        const savedLogs = await figma.clientStorage.getAsync('logEntries') as LogEntry[] || [];
        
        if (savedLogs && savedLogs.length > 0) {
          figma.ui.postMessage({ 
            type: 'SAVED_LOGS', 
            payload: { logs: savedLogs }
          });
        }
      } catch (error) {
        console.error('Error loading saved logs:', error);
      }
      break;
      
    case 'LOG_ENTRY':
      // Получен новый лог от UI
      if (msg.payload) {
        // Добавить в локальный кэш
        logEntries.push(msg.payload as LogEntry);
        
        // Ограничить количество логов
        if (logEntries.length > MAX_LOGS) {
          logEntries = logEntries.slice(-MAX_LOGS);
        }
        
        // Сохранить в clientStorage
        try {
          await figma.clientStorage.setAsync('logEntries', logEntries);
        } catch (error) {
          console.error('Error saving logs:', error);
        }
      }
      break;
      
    case 'EXPORT_LOGS':
      // Запрос на экспорт логов
      try {
        // Получить все логи
        const allLogs = [...logEntries];
        
        // Форматировать логи
        const formattedLogs = allLogs.map(log => 
          `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');
        
        // Отправить логи обратно в UI для скачивания
        figma.ui.postMessage({ 
          type: 'LOGS_EXPORT_DATA', 
          payload: { 
            logsText: formattedLogs,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to export logs: ' + (error instanceof Error ? error.message : String(error)) }
        });
      }
      break;
      
    case 'CLEAR_LOGS':
      // Очистка логов
      logEntries = [];
      try {
        await figma.clientStorage.setAsync('logEntries', []);
        figma.ui.postMessage({ type: 'LOGS_CLEARED' });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to clear logs' }
        });
      }
      break;
      
    case 'CONNECTION_CHANGED':
      // Статус соединения изменился
      if (msg.payload && typeof msg.payload.connected === 'boolean') {
        isConnected = msg.payload.connected;
        console.log('Connection status changed:', isConnected);
      }
      break;
      
    case 'SERVER_MESSAGE':
      // Получено сообщение от сервера через WebSocket
      if (msg.payload) {
        console.log('Server message received:', msg.payload);
        // Обработка различных типов сообщений от сервера
        const serverMessage = msg.payload;
        if (serverMessage.type === 'ANALYSIS_RESULT' || 
            serverMessage.type === 'CODE_GENERATED' || 
            serverMessage.type === 'RESPONSIVE_GENERATED' || 
            serverMessage.type === 'VARIANTS_GENERATED') {
          figma.ui.postMessage({
            type: 'SERVER_RESPONSE',
            payload: serverMessage
          });
        }
      }
      break;
      
    case 'REQUEST_ANALYZE_DESIGN':
      try {
        const selectionData = await getSelectionInfo();
        if (!selectionData.hasSelection) {
          figma.ui.postMessage({ 
            type: 'ERROR', 
            payload: { message: 'No elements selected' }
          });
          return;
        }
        
        console.log('Complete selection data (with tree):', JSON.stringify(selectionData, null, 2));
        
        // Отправить полные данные о выделенных элементах в UI для дальнейшей отправки на сервер
        figma.ui.postMessage({ 
          type: 'SELECTION_DATA', 
          payload: {
            tool: 'analyze',
            data: {
              hasSelection: selectionData.hasSelection,
              count: selectionData.count,
              nodes: selectionData.nodes
            }
          }
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to get selection data: ' + (error instanceof Error ? error.message : String(error)) }
        });
      }
      break;
      
    case 'REQUEST_GENERATE_CODE':
      try {
        const selectionData = await getSelectionInfo();
        if (!selectionData.hasSelection) {
          figma.ui.postMessage({ 
            type: 'ERROR', 
            payload: { message: 'No elements selected' }
          });
          return;
        }
        
        figma.ui.postMessage({ 
          type: 'SELECTION_DATA', 
          payload: {
            tool: 'code',
            data: selectionData
          }
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to get selection data: ' + (error instanceof Error ? error.message : String(error)) }
        });
      }
      break;
      
    case 'REQUEST_GENERATE_RESPONSIVE':
      try {
        const selectionData = await getSelectionInfo();
        if (!selectionData.hasSelection) {
          figma.ui.postMessage({ 
            type: 'ERROR', 
            payload: { message: 'No elements selected' }
          });
          return;
        }
        
        figma.ui.postMessage({ 
          type: 'SELECTION_DATA', 
          payload: {
            tool: 'responsive',
            data: selectionData
          }
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to get selection data: ' + (error instanceof Error ? error.message : String(error)) }
        });
      }
      break;
      
    case 'REQUEST_GENERATE_VARIANTS':
      try {
        const selectionData = await getSelectionInfo();
        if (!selectionData.hasSelection) {
          figma.ui.postMessage({ 
            type: 'ERROR', 
            payload: { message: 'No elements selected' }
          });
          return;
        }
        
        figma.ui.postMessage({ 
          type: 'SELECTION_DATA', 
          payload: {
            tool: 'variants',
            data: selectionData
          }
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to get selection data: ' + (error instanceof Error ? error.message : String(error)) }
        });
      }
      break;
      
    case 'UPDATE_SETTINGS':
      try {
        await saveSettings(msg.payload);
        figma.ui.postMessage({ type: 'SETTINGS_UPDATED' });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to save settings' }
        });
      }
      break;
      
    case 'GET_SETTINGS':
      try {
        const settings = await loadSettings();
        figma.ui.postMessage({ 
          type: 'SETTINGS', 
          payload: settings 
        });
      } catch (error) {
        figma.ui.postMessage({ 
          type: 'ERROR', 
          payload: { message: 'Failed to load settings' }
        });
      }
      break;
  }
}; 