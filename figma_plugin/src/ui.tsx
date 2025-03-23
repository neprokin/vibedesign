import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './ui.css';
import { EventService } from './services/event-service';
import DebugPanel from './components/DebugPanel';
import { TestService } from './services/test-service';
import { NodeUpdater } from './services/node-updater';
import { FigmaEventType } from './types/events';

/**
 * Основной компонент приложения
 */
const App: React.FC = () => {
  const [serverUrl, setServerUrl] = React.useState<string>(() => {
    return localStorage.getItem('serverUrl') || 'ws://localhost:8765';
  });
  const [isConnected, setIsConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);
  const [showDebug, setShowDebug] = React.useState(() => {
    const savedValue = localStorage.getItem('showDebug');
    return savedValue ? JSON.parse(savedValue) : false;
  });
  const [isTestRunning, setIsTestRunning] = React.useState(false);

  const eventService = React.useMemo(() => new EventService(), []);
  const nodeUpdater = React.useMemo(() => new NodeUpdater(eventService), [eventService]);
  const testService = React.useMemo(() => new TestService(eventService, nodeUpdater), [eventService, nodeUpdater]);

  React.useEffect(() => {
    // Отправляем сообщение о загрузке UI
    parent.postMessage({ pluginMessage: { type: 'UI_LOADED' } }, '*');

    // Регистрируем обработчик событий для получения сообщений от плагина
    window.onmessage = (event) => {
      const message = event.data.pluginMessage;
      if (!message) return;

      if (message.type === 'CONNECTION_STATUS') {
        setIsConnected(message.connected);
        setIsConnecting(false);
        setConnectionError(null);
      } else if (message.type === 'CONNECTION_ERROR') {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionError(message.error);
      }
    };

    return () => {
      window.onmessage = null;
    };
  }, []);

  // Обработчик подключения к серверу
  const handleConnect = () => {
    setIsConnecting(true);
    setConnectionError(null);
    localStorage.setItem('serverUrl', serverUrl);
    
    parent.postMessage({ 
      pluginMessage: { 
        type: 'CONNECT', 
        serverUrl 
      } 
    }, '*');
  };

  // Обработчик отключения от сервера
  const handleDisconnect = () => {
    parent.postMessage({ 
      pluginMessage: { 
        type: 'DISCONNECT' 
      } 
    }, '*');
  };

  // Получение информации о выделении
  const handleGetSelection = () => {
    parent.postMessage({ 
      pluginMessage: { 
        type: 'GET_SELECTION' 
      } 
    }, '*');
  };

  // Переключение панели отладки
  const toggleDebugPanel = () => {
    const newState = !showDebug;
    setShowDebug(newState);
    localStorage.setItem('showDebug', JSON.stringify(newState));
  };

  // Запуск тестирования
  const handleRunTest = (testType: 'ping' | 'node-update') => {
    if (!isConnected) {
      setConnectionError('Необходимо подключиться к серверу для запуска тестов');
      return;
    }
    
    testService.runSingleTest(testType);
  };

  // Запуск автоматического тестирования
  const handleStartAutomatedTest = () => {
    if (!isConnected) {
      setConnectionError('Необходимо подключиться к серверу для запуска тестов');
      return;
    }
    
    setIsTestRunning(true);
    testService.startAutomatedTest(10, () => {
      setIsTestRunning(false);
    });
  };

  // Остановка автоматического тестирования
  const handleStopAutomatedTest = () => {
    testService.stopAutomatedTest();
    setIsTestRunning(false);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Vibe Design</h1>
      </header>
      
      <section className="section">
        <h2>Соединение с сервером</h2>
        <div className="connection-form">
          <div className="input-group">
            <label>URL сервера:</label>
            <input 
              type="text" 
              value={serverUrl} 
              onChange={(e) => setServerUrl(e.target.value)}
              disabled={isConnected}
            />
          </div>
          
          <div className="button-group">
            {!isConnected ? (
              <button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="primary-button"
              >
                {isConnecting ? 'Подключение...' : 'Подключиться'}
              </button>
            ) : (
              <button 
                onClick={handleDisconnect}
                className="secondary-button"
              >
                Отключиться
              </button>
            )}
          </div>
          
          {connectionError && (
            <div className="error-message">
              Ошибка: {connectionError}
            </div>
          )}
          
          {isConnected && (
            <div className="success-message">
              Подключено к {serverUrl}
            </div>
          )}
        </div>
      </section>
      
      <section className="section">
        <h2>Доступные действия</h2>
        <div className="actions-panel">
          <button 
            onClick={handleGetSelection} 
            disabled={!isConnected}
            className={!isConnected ? 'disabled-button' : ''}
          >
            Получить выделение
          </button>
          
          <button onClick={toggleDebugPanel}>
            {showDebug ? 'Скрыть панель отладки' : 'Показать панель отладки'}
          </button>
        </div>
      </section>
      
      <section className="section">
        <h2>Тестирование</h2>
        <div className="actions-panel">
          <button 
            onClick={() => handleRunTest('ping')} 
            disabled={!isConnected || isTestRunning}
            className={!isConnected || isTestRunning ? 'disabled-button' : ''}
          >
            Ping тест
          </button>
          
          <button 
            onClick={() => handleRunTest('node-update')} 
            disabled={!isConnected || isTestRunning}
            className={!isConnected || isTestRunning ? 'disabled-button' : ''}
          >
            Тест обновления узла
          </button>
          
          {!isTestRunning ? (
            <button 
              onClick={handleStartAutomatedTest} 
              disabled={!isConnected}
              className={!isConnected ? 'disabled-button' : ''}
            >
              Запустить авто-тест
            </button>
          ) : (
            <button 
              onClick={handleStopAutomatedTest}
              className="secondary-button"
            >
              Остановить авто-тест
            </button>
          )}
        </div>
      </section>
      
      {showDebug && (
        <section className="debug-section">
          <DebugPanel eventService={eventService} isVisible={showDebug} />
        </section>
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('react-page'));

// Функция для отправки сообщений в plugin.ts
export const sendToPlugin = (type: string, payload?: any) => {
  parent.postMessage(
    {
      pluginMessage: {
        type,
        payload,
      },
    },
    '*'
  );
}; 