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
  console.log(`[DEBUG] Starting to process node: ${node.name} (${node.type})`);
  
  try {
    // Базовая информация о узле (безопасные свойства)
    const nodeInfo: any = {
      id: node.id,
      name: node.name,
      type: node.type
    };

    // Безопасно добавляем свойства, только если они существуют
    if ('visible' in node) nodeInfo.visible = node.visible;
    if ('locked' in node) nodeInfo.locked = node.locked;
    if ('x' in node) nodeInfo.x = node.x;
    if ('y' in node) nodeInfo.y = node.y;
    if ('width' in node) nodeInfo.width = node.width;
    if ('height' in node) nodeInfo.height = node.height;
    
    console.log(`[DEBUG] Basic node info collected for ${node.name}`);
    
    // Специфические свойства в зависимости от типа узла
    if (node.type === 'TEXT' && 'characters' in node) {
      console.log(`[DEBUG] Processing TEXT node: ${node.name}`);
      nodeInfo.text = {
        characters: node.characters
      };
      // Безопасно добавляем дополнительные текстовые свойства
      if ('fontSize' in node) nodeInfo.text.fontSize = node.fontSize;
      if ('fontName' in node) nodeInfo.text.fontName = node.fontName;
      if ('textAlignHorizontal' in node) nodeInfo.text.textAlignHorizontal = node.textAlignHorizontal;
      if ('textAlignVertical' in node) nodeInfo.text.textAlignVertical = node.textAlignVertical;
    }
    
    // Безопасно проверяем и добавляем fills
    if ('fills' in node && node.fills) {
      try {
        nodeInfo.fills = JSON.parse(JSON.stringify(node.fills));
      } catch (error) {
        console.warn(`[WARN] Could not process fills for ${node.name}`);
      }
    }
    
    // Безопасно проверяем и добавляем strokes
    if ('strokes' in node && node.strokes) {
      try {
        nodeInfo.strokes = JSON.parse(JSON.stringify(node.strokes));
      } catch (error) {
        console.warn(`[WARN] Could not process strokes for ${node.name}`);
      }
    }
    
    // Безопасно проверяем и добавляем effects
    if ('effects' in node && node.effects) {
      try {
        nodeInfo.effects = JSON.parse(JSON.stringify(node.effects));
      } catch (error) {
        console.warn(`[WARN] Could not process effects for ${node.name}`);
      }
    }
    
    // Auto Layout свойства - безопасная проверка
    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
      console.log(`[DEBUG] Processing Auto Layout for ${node.name}`);
      nodeInfo.autoLayout = {
        layoutMode: node.layoutMode
      };
      
      // Безопасно добавляем свойства Auto Layout
      if ('primaryAxisSizingMode' in node) nodeInfo.autoLayout.primaryAxisSizingMode = node.primaryAxisSizingMode;
      if ('counterAxisSizingMode' in node) nodeInfo.autoLayout.counterAxisSizingMode = node.counterAxisSizingMode;
      if ('primaryAxisAlignItems' in node) nodeInfo.autoLayout.primaryAxisAlignItems = node.primaryAxisAlignItems;
      if ('counterAxisAlignItems' in node) nodeInfo.autoLayout.counterAxisAlignItems = node.counterAxisAlignItems;
      if ('paddingTop' in node) nodeInfo.autoLayout.padding = {
        top: node.paddingTop,
        right: node.paddingRight,
        bottom: node.paddingBottom,
        left: node.paddingLeft
      };
      if ('itemSpacing' in node) nodeInfo.autoLayout.itemSpacing = node.itemSpacing;
      if ('clipsContent' in node) nodeInfo.autoLayout.clipsContent = node.clipsContent;
    }

    // Безопасная обработка компонентов и их экземпляров
    if (node.type === 'INSTANCE') {
      console.log(`[DEBUG] Processing INSTANCE node: ${node.name}`);
      try {
        const instance = node as InstanceNode;
        nodeInfo.componentData = {
          type: 'instance',
          id: instance.id
        };
        
        // Безопасно пытаемся получить информацию о главном компоненте
        try {
          if (instance.mainComponent) {
            nodeInfo.componentData.mainComponentName = instance.mainComponent.name;
            nodeInfo.componentData.mainComponentId = instance.mainComponent.id;
          }
        } catch (error) {
          console.warn(`[WARN] Could not access mainComponent for instance ${node.name}`);
        }
        
        // Безопасно пытаемся получить override'ы
        try {
          if ('overrides' in instance) {
            nodeInfo.componentData.overrides = instance.overrides;
          }
        } catch (error) {
          console.warn(`[WARN] Could not access overrides for instance ${node.name}`);
        }
      } catch (error) {
        console.warn(`[WARN] Error processing instance ${node.name}:`, error);
      }
    }

    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      console.log(`[DEBUG] Processing ${node.type} node: ${node.name}`);
      try {
        nodeInfo.componentData = {
          type: node.type.toLowerCase(),
          id: node.id
        };
        
        // Безопасно добавляем дополнительные свойства компонента
        if ('description' in node) nodeInfo.componentData.description = node.description;
        if ('key' in node) nodeInfo.componentData.key = node.key;
        
        // Для COMPONENT_SET пытаемся получить варианты
        if (node.type === 'COMPONENT_SET' && 'variantGroupProperties' in node) {
          try {
            nodeInfo.componentData.variantGroupProperties = node.variantGroupProperties;
          } catch (error) {
            console.warn(`[WARN] Could not access variant properties for ${node.name}`);
          }
        }
      } catch (error) {
        console.warn(`[WARN] Error processing component ${node.name}:`, error);
      }
    }
    
    // Безопасная обработка дочерних элементов
    if ('children' in node) {
      try {
        // Проверяем, можно ли получить доступ к children
        const children = node.children;
        if (Array.isArray(children)) {
          console.log(`[DEBUG] Processing children for ${node.name} (${children.length} children)`);
          nodeInfo.children = [];
          
          for (const child of children) {
            try {
              if (child && typeof child === 'object') {
                console.log(`[DEBUG] Processing child: ${child.name} (${child.type}) of ${node.name}`);
                const childInfo = getSceneTree(child);
                if (childInfo) {
                  nodeInfo.children.push(childInfo);
                }
              }
            } catch (childError) {
              console.warn(`[WARN] Skipping child of ${node.name}:`, childError);
            }
          }
        }
      } catch (error) {
        console.warn(`[WARN] Could not process children for ${node.name}:`, error);
        nodeInfo.children = [];
      }
    }
    
    console.log(`[DEBUG] Successfully processed node: ${node.name}`);
    return nodeInfo;
  } catch (error) {
    console.error(`[ERROR] Failed to process node ${node.name}:`, error);
    // Возвращаем минимальную безопасную информацию
    return {
      id: node.id || 'unknown',
      name: node.name || 'unknown',
      type: node.type || 'unknown',
      error: 'Failed to process node'
    };
  }
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

function processSelectedNode(node: SceneNode): any {
  try {
    // Базовая информация о ноде
    const nodeInfo = {
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
      locked: node.locked
    };

    // Обработка INSTANCE
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode;
      nodeInfo.componentData = {
        mainComponentName: instance.mainComponent?.name || 'Unknown',
        mainComponentId: instance.mainComponent?.id || 'Unknown',
        overrides: instance.overrides || []
      };
    }

    // Обработка COMPONENT
    if (node.type === 'COMPONENT') {
      const component = node as ComponentNode;
      nodeInfo.componentData = {
        description: component.description || '',
        key: component.key
      };
    }

    // Обработка дочерних элементов для всех типов контейнеров
    if ('children' in node) {
      try {
        nodeInfo.children = (node as ChildrenMixin).children.map(child => {
          try {
            return processSelectedNode(child);
          } catch (childError) {
            console.warn(`Skipping child node ${child.name}: ${childError.message}`);
            return {
              id: child.id,
              name: child.name,
              type: child.type,
              error: 'Failed to process child node'
            };
          }
        }).filter(Boolean);
      } catch (childrenError) {
        console.warn(`Error processing children of ${node.name}: ${childrenError.message}`);
        nodeInfo.children = [];
      }
    }

    return nodeInfo;
  } catch (error) {
    console.error(`Error processing node ${node.name}: ${error.message}`);
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      error: 'Failed to process node'
    };
  }
} 