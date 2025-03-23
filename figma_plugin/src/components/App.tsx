import React, { useState, useEffect } from 'react';
import Header from './Header';
import Toolbar from './Toolbar';
import Settings from './Settings';
import Results from './Results';

// Типы инструментов
export type ToolType = 'analyze' | 'code' | 'responsive' | 'variants';

// Основной компонент приложения
const App: React.FC = () => {
  // Состояние подключения к MCP-серверу
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Активный инструмент
  const [activeTool, setActiveTool] = useState<ToolType>('analyze');
  
  // Результаты операций
  const [results, setResults] = useState<any>(null);
  
  // Загрузка
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Инициализация - пытаемся ли мы подключиться
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Состояние окна настроек
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // URL сервера в настройках
  const [serverUrl, setServerUrl] = useState<string>("ws://localhost:8768");

  // Эффект при монтировании компонента
  useEffect(() => {
    // Запрос статуса соединения при загрузке
    parent.postMessage({ pluginMessage: { type: 'GET_CONNECTION_STATUS' } }, '*');
    
    // Запрос текущих настроек
    parent.postMessage({ pluginMessage: { type: 'GET_SETTINGS' } }, '*');
    
    // Автоматически пытаемся подключиться при запуске
    setTimeout(() => {
      parent.postMessage({
        pluginMessage: { type: 'CONNECT' }
      }, '*');
    }, 1000);
    
    // Обработчик сообщений от plugin.ts
    const handleMessage = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (!message) return;
      
      setIsInitializing(false);
      
      switch (message.type) {
        case 'CONNECTION_STATUS':
          setIsConnected(message.payload.connected);
          break;
          
        case 'SERVER_RESPONSE':
          setResults(message.payload);
          setIsLoading(false);
          break;

        case 'CONNECTED':
          setIsConnected(true);
          break;

        case 'DISCONNECTED':
          setIsConnected(false);
          break;
          
        case 'SETTINGS':
          // Обновление состояния настроек из плагина
          if (message.payload?.serverUrl) {
            setServerUrl(message.payload.serverUrl);
          }
          break;
          
        case 'ERROR':
          console.error('Error:', message.payload);
          setIsLoading(false);
          break;
          
        default:
          break;
      }
    };
    
    // Подписка на сообщения
    window.addEventListener('message', handleMessage);
    
    // Очистка подписки при размонтировании
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Обработчик подключения к серверу
  const handleConnect = () => {
    setIsLoading(true);
    parent.postMessage({
      pluginMessage: { type: 'CONNECT' }
    }, '*');
  };

  // Обработчик открытия настроек
  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  // Обработчик закрытия настроек
  const handleCloseSettings = () => {
    setShowSettings(false);
  };
  
  // Обработчик сохранения настроек
  const handleSaveSettings = () => {
    parent.postMessage({
      pluginMessage: {
        type: 'UPDATE_SETTINGS',
        payload: {
          serverUrl
        }
      }
    }, '*');
    setShowSettings(false);
  };

  // Обработчик выбора инструмента
  const handleToolSelect = (tool: ToolType) => {
    setActiveTool(tool);
    setResults(null); // Сбрасываем результаты при смене инструмента
  };

  // Обработчик отправки запроса
  const handleSubmit = (data: any) => {
    setIsLoading(true);
    
    // Отправка запроса в plugin.ts
    switch (activeTool) {
      case 'analyze':
        parent.postMessage({
          pluginMessage: {
            type: 'ANALYZE_DESIGN',
            payload: data
          }
        }, '*');
        break;
        
      case 'code':
        parent.postMessage({
          pluginMessage: {
            type: 'GENERATE_CODE_REQUEST',
            payload: data
          }
        }, '*');
        break;
        
      case 'responsive':
        parent.postMessage({
          pluginMessage: {
            type: 'GENERATE_RESPONSIVE',
            payload: data
          }
        }, '*');
        break;
        
      case 'variants':
        parent.postMessage({
          pluginMessage: {
            type: 'GENERATE_VARIANTS',
            payload: data
          }
        }, '*');
        break;
        
      default:
        setIsLoading(false);
        break;
    }
  };

  // Если идет инициализация, показываем загрузку
  if (isInitializing) {
    return (
      <div className="container">
        <h1>Vibe Design</h1>
        <div className="loading-message">Инициализация плагина...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header 
        isConnected={isConnected} 
        onConnect={handleConnect} 
        onOpenSettings={handleOpenSettings} 
      />
      
      {isConnected ? (
        <>
          <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
          
          <Settings 
            tool={activeTool} 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
          />
          
          {results && !isLoading && (
            <Results tool={activeTool} data={results} />
          )}
        </>
      ) : (
        <div className="connection-banner">
          <h2>Необходимо подключение к MCP-серверу</h2>
          <p>Пожалуйста, убедитесь, что MCP-сервер запущен на {serverUrl}</p>
          <button 
            className="button button--primary" 
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? 'Подключение...' : 'Подключиться к серверу'}
          </button>
        </div>
      )}
      
      {isLoading && (
        <div className="loading">
          <div className="loading__spinner"></div>
        </div>
      )}

      {showSettings && (
        <div className="modal">
          <div className="modal__content">
            <h2>Настройки</h2>
            <div className="modal__body">
              <div className="form-group">
                <label>URL MCP-сервера</label>
                <input 
                  type="text" 
                  className="input" 
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="Введите URL MCP-сервера"
                />
              </div>
            </div>
            <div className="modal__footer">
              <button className="button" onClick={handleCloseSettings}>Закрыть</button>
              <button className="button button--primary" onClick={handleSaveSettings}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App; 