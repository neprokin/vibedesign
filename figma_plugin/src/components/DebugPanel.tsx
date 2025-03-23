import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { EventService } from '../services/event-service';
import { FigmaEventType, FigmaEvent } from '../types/events';

interface LogEntry {
  timestamp: Date;
  type: string;
  direction: 'in' | 'out';
  event?: any;
  message?: string;
}

interface DebugPanelProps {
  eventService: EventService;
  isVisible: boolean;
}

const DebugPanelContainer = styled.div<{ isVisible: boolean }>`
  display: ${props => props.isVisible ? 'flex' : 'none'};
  flex-direction: column;
  background-color: #f5f5f5;
  border-top: 1px solid #ccc;
  height: 250px;
  width: 100%;
  overflow: hidden;
`;

const DebugPanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background-color: #e0e0e0;
  border-bottom: 1px solid #ccc;
`;

const DebugPanelTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  background-color: #ffffff;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background-color: #f0f0f0;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #ccc;
`;

const Tab = styled.div<{ active: boolean }>`
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  border-right: 1px solid #ccc;
  background-color: ${props => props.active ? '#fff' : '#eee'};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  
  &:hover {
    background-color: ${props => props.active ? '#fff' : '#e5e5e5'};
  }
`;

const LogContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
  padding: 0;
  background-color: #fff;
`;

const LogEntryItem = styled.div<{ type: string }>`
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: pre-wrap;
  word-break: break-all;
  background-color: ${props => getLogEntryColor(props.type)};
  display: flex;
`;

const LogTime = styled.span`
  color: #999;
  margin-right: 8px;
  min-width: 80px;
`;

const LogType = styled.span<{ type: string }>`
  color: ${props => getLogTypeColor(props.type)};
  margin-right: 8px;
  min-width: 120px;
  font-weight: bold;
`;

const LogDirection = styled.span<{ direction: 'in' | 'out' }>`
  color: ${props => props.direction === 'in' ? '#0066cc' : '#cc6600'};
  margin-right: 8px;
  min-width: 40px;
`;

const LogMessage = styled.span`
  flex: 1;
`;

const ConnectionStatus = styled.div<{ connected: boolean }>`
  display: flex;
  align-items: center;
  margin-left: 16px;
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.connected ? '#00cc66' : '#cc0000'};
    margin-right: 8px;
  }
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background-color: #f0f0f0;
  border-top: 1px solid #ccc;
  font-size: 11px;
`;

// Вспомогательные функции
function getLogEntryColor(type: string): string {
  if (type === 'ERROR') return '#fff0f0';
  if (type.includes('PROGRESS')) return '#f0fff0';
  if (type.includes('COMPLETE')) return '#f0f8ff';
  return '#ffffff';
}

function getLogTypeColor(type: string): string {
  if (type === 'ERROR') return '#cc0000';
  if (type.includes('REQUEST')) return '#0066cc';
  if (type.includes('PROGRESS')) return '#00cc66';
  if (type.includes('COMPLETE')) return '#6600cc';
  if (type === 'CONNECT' || type === 'DISCONNECT') return '#cc6600';
  if (type === 'PING' || type === 'PONG') return '#999999';
  return '#333333';
}

function formatTimestamp(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const millis = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ eventService, isVisible }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('events');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  
  useEffect(() => {
    // Регистрируем обработчики событий
    const handleIncomingEvent = (event: FigmaEvent) => {
      addLog({
        timestamp: new Date(),
        type: event.type,
        direction: 'in',
        event: event
      });
    };
    
    // Функция для перехвата исходящих событий
    const captureOutgoingEvents = () => {
      // Сохраняем оригинальный метод
      const originalSendEvent = eventService.sendEvent;
      
      // Переопределяем метод для перехвата исходящих событий
      // @ts-ignore - Игнорируем проблемы типизации при переопределении метода
      eventService.sendEvent = function(type: FigmaEventType, payload?: any) {
        // Логируем исходящее событие
        addLog({
          timestamp: new Date(),
          type: type,
          direction: 'out',
          event: { type, payload }
        });
        
        // Вызываем оригинальный метод
        return originalSendEvent.call(eventService, type, payload);
      };
      
      // Возвращаем функцию для восстановления оригинального метода
      return () => {
        eventService.sendEvent = originalSendEvent;
      };
    };
    
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      addLog({
        timestamp: new Date(),
        type: connected ? FigmaEventType.CONNECT : FigmaEventType.DISCONNECT,
        direction: connected ? 'in' : 'out',
        message: connected ? 'Connected to server' : 'Disconnected from server'
      });
    };
    
    // Ограничиваем количество логов
    const MAX_LOGS = 1000;
    const addLog = (log: LogEntry) => {
      setLogs(prevLogs => {
        const newLogs = [log, ...prevLogs];
        return newLogs.slice(0, MAX_LOGS);
      });
    };
    
    // Проверяем текущее состояние соединения
    setIsConnected(eventService.isConnected());
    
    // Регистрируем обработчики для всех типов событий
    // Конвертируем enum в массив строк для итерации
    const eventTypes = Object.values(FigmaEventType);
    
    for (const eventType of eventTypes) {
      eventService.registerEventHandler(eventType as FigmaEventType, handleIncomingEvent);
    }
    
    // Устанавливаем перехват исходящих событий
    const restoreOriginalSendEvent = captureOutgoingEvents();
    
    // Специально обрабатываем события соединения
    const connectHandler = () => handleConnectionChange(true);
    const disconnectHandler = () => handleConnectionChange(false);
    
    eventService.registerEventHandler(FigmaEventType.CONNECT, connectHandler);
    eventService.registerEventHandler(FigmaEventType.DISCONNECT, disconnectHandler);
    
    // Очистка при размонтировании
    return () => {
      // Отписываемся от всех событий
      for (const eventType of eventTypes) {
        eventService.unregisterEventHandler(eventType as FigmaEventType, handleIncomingEvent);
      }
      
      // Отписываемся от специальных обработчиков
      eventService.unregisterEventHandler(FigmaEventType.CONNECT, connectHandler);
      eventService.unregisterEventHandler(FigmaEventType.DISCONNECT, disconnectHandler);
      
      // Восстанавливаем оригинальный метод отправки событий
      restoreOriginalSendEvent();
    };
  }, [eventService]);
  
  // Фильтруем логи при изменении фильтра или логов
  useEffect(() => {
    if (!filter) {
      setFilteredLogs(logs);
      return;
    }
    
    const lowerFilter = filter.toLowerCase();
    setFilteredLogs(logs.filter(log => 
      log.type.toLowerCase().includes(lowerFilter) || 
      (log.message && log.message.toLowerCase().includes(lowerFilter)) ||
      (log.event && JSON.stringify(log.event).toLowerCase().includes(lowerFilter))
    ));
  }, [logs, filter]);
  
  // Автоматическая прокрутка
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [filteredLogs, autoScroll]);
  
  const handleClearLogs = () => {
    setLogs([]);
  };
  
  const handleExportLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `figma-plugin-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };
  
  const renderEventLog = (log: LogEntry) => {
    const eventJson = log.event ? JSON.stringify(log.event, null, 2) : '';
    return (
      <LogEntryItem key={`${log.timestamp.getTime()}-${log.type}`} type={log.type}>
        <LogTime>{formatTimestamp(log.timestamp)}</LogTime>
        <LogType type={log.type}>{log.type}</LogType>
        <LogDirection direction={log.direction}>{log.direction === 'in' ? '←' : '→'}</LogDirection>
        <LogMessage>
          {log.message || (log.event ? eventJson : '')}
        </LogMessage>
      </LogEntryItem>
    );
  };
  
  return (
    <DebugPanelContainer isVisible={isVisible}>
      <DebugPanelHeader>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DebugPanelTitle>Debug Panel</DebugPanelTitle>
          <ConnectionStatus connected={isConnected}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </ConnectionStatus>
        </div>
        <ButtonGroup>
          <input 
            type="text" 
            placeholder="Filter logs..." 
            value={filter} 
            onChange={handleFilterChange}
            style={{ padding: '2px 4px', fontSize: '12px' }}
          />
          <Button onClick={() => setAutoScroll(!autoScroll)}>
            {autoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}
          </Button>
          <Button onClick={handleClearLogs}>Clear</Button>
          <Button onClick={handleExportLogs}>Export</Button>
        </ButtonGroup>
      </DebugPanelHeader>
      
      <TabsContainer>
        <Tab active={activeTab === 'events'} onClick={() => setActiveTab('events')}>Events</Tab>
        <Tab active={activeTab === 'network'} onClick={() => setActiveTab('network')}>Network</Tab>
        <Tab active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')}>Metrics</Tab>
      </TabsContainer>
      
      {activeTab === 'events' && (
        <LogContainer ref={logContainerRef}>
          {filteredLogs.length > 0 ? (
            filteredLogs.map(renderEventLog)
          ) : (
            <div style={{ padding: '8px', textAlign: 'center', color: '#999' }}>
              No logs to display
            </div>
          )}
        </LogContainer>
      )}
      
      {activeTab === 'network' && (
        <LogContainer>
          <div style={{ padding: '8px' }}>
            Network status information will be available here
          </div>
        </LogContainer>
      )}
      
      {activeTab === 'metrics' && (
        <LogContainer>
          <div style={{ padding: '8px' }}>
            Performance metrics will be available here
          </div>
        </LogContainer>
      )}
      
      <StatusBar>
        <div>Total events: {logs.length}</div>
        <div>Filtered: {filteredLogs.length}</div>
        <div>Debug mode: ON</div>
      </StatusBar>
    </DebugPanelContainer>
  );
};

export default DebugPanel; 