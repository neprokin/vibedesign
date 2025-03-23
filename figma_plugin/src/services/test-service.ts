import { EventService } from './event-service';
import { NodeUpdater } from './node-updater';
import { FigmaEventType, createEvent } from '../types/events';

/**
 * Сервис для тестирования функциональности плагина и WebSocket соединения
 */
export class TestService {
  private eventService: EventService;
  private nodeUpdater: NodeUpdater;
  private testInterval: ReturnType<typeof setInterval> | null = null;
  private testCount = 0;
  private maxTests = 10;
  private isRunning = false;
  private onTestCompleted: (() => void) | null = null;

  /**
   * Конструктор
   */
  constructor(eventService: EventService, nodeUpdater: NodeUpdater) {
    this.eventService = eventService;
    this.nodeUpdater = nodeUpdater;
  }

  /**
   * Запускает автоматическое тестирование
   */
  startAutomatedTest(maxTests: number = 10, onCompleted?: () => void): void {
    if (this.isRunning) {
      console.log('Test is already running');
      return;
    }

    this.isRunning = true;
    this.testCount = 0;
    this.maxTests = maxTests;
    this.onTestCompleted = onCompleted || null;

    console.log(`Starting automated test with ${maxTests} iterations`);
    
    // Запускаем интервал для периодического выполнения тестов
    this.testInterval = setInterval(() => {
      this.runNextTest();
    }, 5000); // Интервал 5 секунд

    // Запускаем первый тест сразу
    this.runNextTest();
  }

  /**
   * Останавливает автоматическое тестирование
   */
  stopAutomatedTest(): void {
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }
    
    this.isRunning = false;
    console.log('Automated test stopped');
  }

  /**
   * Запускает отдельный тест выбранного типа
   */
  runSingleTest(testType: 'ping' | 'node-update'): void {
    switch (testType) {
      case 'ping':
        this.testPing();
        break;
      case 'node-update':
        this.testNodeUpdate();
        break;
      default:
        console.error(`Unknown test type: ${testType}`);
    }
  }

  /**
   * Запускает следующий тест в автоматизированной последовательности
   */
  private runNextTest(): void {
    if (this.testCount >= this.maxTests) {
      this.stopAutomatedTest();
      
      if (this.onTestCompleted) {
        this.onTestCompleted();
      }
      
      return;
    }

    // Выбираем случайный тест из доступных
    const testTypes = ['ping', 'node-update'];
    const randomIndex = Math.floor(Math.random() * testTypes.length);
    const testType = testTypes[randomIndex] as 'ping' | 'node-update';
    
    this.runSingleTest(testType);
    
    this.testCount++;
    console.log(`Test ${this.testCount}/${this.maxTests} completed: ${testType}`);
  }

  /**
   * Тест соединения (ping-pong)
   */
  private testPing(): void {
    const startTime = Date.now();
    
    // Отправляем PING и ожидаем PONG
    this.eventService.sendEventAndWaitForResponse(
      FigmaEventType.PING, 
      { timestamp: startTime },
      5000 // Таймаут 5 секунд
    ).then(response => {
      const endTime = Date.now();
      const pingTime = endTime - startTime;
      
      console.log(`Ping test successful: ${pingTime}ms`);
      
      // Отправляем лог об успешном тесте
      parent.postMessage({ 
        pluginMessage: { 
          type: 'LOG_ENTRY', 
          logEntry: {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Ping test successful: ${pingTime}ms`
          }
        } 
      }, '*');
      
    }).catch(error => {
      console.error('Ping test failed:', error);
      
      // Отправляем лог об ошибке
      parent.postMessage({ 
        pluginMessage: { 
          type: 'LOG_ENTRY', 
          logEntry: {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: `Ping test failed: ${error}`
          }
        } 
      }, '*');
    });
  }

  /**
   * Тест обновления узла
   */
  private testNodeUpdate(): void {
    // Получаем текущее выделение в Figma
    parent.postMessage({ pluginMessage: { type: 'GET_SELECTION' } }, '*');
    
    // Подписываемся на событие получения выделения
    const handleSelectionInfo = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (!message || message.type !== 'SELECTION_INFO') return;
      
      // Удаляем обработчик после получения одного сообщения
      window.removeEventListener('message', handleSelectionInfo);
      
      // Проверяем, есть ли выделение
      if (!message.hasSelection || message.count === 0) {
        console.log('No selection for node update test');
        
        // Отправляем лог об ошибке
        parent.postMessage({ 
          pluginMessage: { 
            type: 'LOG_ENTRY', 
            logEntry: {
              timestamp: new Date().toISOString(),
              level: 'warn',
              message: 'No selection for node update test'
            }
          } 
        }, '*');
        
        return;
      }
      
      // Берем первый выделенный узел
      const selectedNode = message.selection[0];
      
      // Генерируем случайный цвет
      const randomColor = this.getRandomColor();
      
      // Обновляем узел с случайными свойствами
      this.nodeUpdater.updateNode(selectedNode.id, {
        name: `Test-${Date.now()}`,
        fill: randomColor,
        opacity: Math.random() * 0.5 + 0.5, // От 0.5 до 1.0
      }).then(result => {
        if (result.success) {
          console.log('Node update test successful');
          
          // Отправляем лог об успешном тесте
          parent.postMessage({ 
            pluginMessage: { 
              type: 'LOG_ENTRY', 
              logEntry: {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Node update test successful: ${selectedNode.id}, color: ${randomColor}`
              }
            } 
          }, '*');
        } else {
          console.error('Node update test failed');
          
          // Отправляем лог об ошибке
          parent.postMessage({ 
            pluginMessage: { 
              type: 'LOG_ENTRY', 
              logEntry: {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Node update test failed'
              }
            } 
          }, '*');
        }
      }).catch(error => {
        console.error('Node update test error:', error);
        
        // Отправляем лог об ошибке
        parent.postMessage({ 
          pluginMessage: { 
            type: 'LOG_ENTRY', 
            logEntry: {
              timestamp: new Date().toISOString(),
              level: 'error',
              message: `Node update test error: ${error}`
            }
          } 
        }, '*');
      });
    };
    
    // Регистрируем временный обработчик для получения информации о выделении
    window.addEventListener('message', handleSelectionInfo);
  }
  
  /**
   * Генерирует случайный цвет в формате HEX
   */
  private getRandomColor(): string {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }
} 