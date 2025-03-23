import json
import uuid
import datetime
import asyncio
import logging
from typing import Any, Dict, List, Optional, Callable, Awaitable, TypeVar, Generic, Union, Type
from enum import Enum, auto
from dataclasses import dataclass, asdict, field
from .logger import logger
from .websocket import WebSocketServer
from .metrics import get_metrics_registry, timed, TimerContext

# Определение типов событий
class FigmaEventType(str, Enum):
    # Системные события
    CONNECT = 'CONNECT'
    DISCONNECT = 'DISCONNECT'
    ERROR = 'ERROR'
    PING = 'PING'
    PONG = 'PONG'
    
    # События обновления узлов
    UPDATE_NODE_REQUEST = 'UPDATE_NODE_REQUEST'
    UPDATE_NODE_PROGRESS = 'UPDATE_NODE_PROGRESS'
    UPDATE_NODE_COMPLETE = 'UPDATE_NODE_COMPLETE'
    UPDATE_NODE_ERROR = 'UPDATE_NODE_ERROR'
    
    # События выбора
    SELECTION_CHANGE = 'SELECTION_CHANGE'
    MULTI_SELECTION = 'MULTI_SELECTION'
    
    # События анализа дизайна
    ANALYZE_DESIGN = 'ANALYZE_DESIGN'
    ANALYSIS_RESULT = 'ANALYSIS_RESULT'
    
    # События генерации кода
    GENERATE_CODE = 'GENERATE_CODE'
    GENERATE_CODE_REQUEST = 'GENERATE_CODE_REQUEST'
    GENERATE_CODE_PROGRESS = 'GENERATE_CODE_PROGRESS'
    GENERATE_CODE_COMPLETE = 'GENERATE_CODE_COMPLETE'
    CODE_GENERATED = 'CODE_GENERATED'
    
    # События генерации адаптивного макета
    GENERATE_RESPONSIVE = 'GENERATE_RESPONSIVE'
    RESPONSIVE_GENERATED = 'RESPONSIVE_GENERATED'
    
    # События генерации вариантов
    GENERATE_VARIANTS = 'GENERATE_VARIANTS'
    VARIANTS_GENERATED = 'VARIANTS_GENERATED'


class EventSource(str, Enum):
    PLUGIN = 'plugin'
    SERVER = 'server'


@dataclass
class EventMetadata:
    timestamp: str
    source: EventSource
    correlation_id: str
    session_id: str


@dataclass
class FigmaEvent:
    type: FigmaEventType
    payload: Dict[str, Any]
    metadata: EventMetadata
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FigmaEvent':
        """Создает событие из словаря."""
        return cls(
            type=data['type'],
            payload=data['payload'],
            metadata=EventMetadata(
                timestamp=data['metadata']['timestamp'],
                source=data['metadata']['source'],
                correlation_id=data['metadata']['correlationId'],
                session_id=data['metadata']['sessionId']
            )
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразует событие в словарь."""
        return {
            'type': self.type,
            'payload': self.payload,
            'metadata': {
                'timestamp': self.metadata.timestamp,
                'source': self.metadata.source,
                'correlationId': self.metadata.correlation_id,
                'sessionId': self.metadata.session_id
            }
        }


@dataclass
class UpdateNodeRequestPayload:
    node_id: str
    properties: Dict[str, Any]
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UpdateNodeRequestPayload':
        """Создает полезную нагрузку запроса обновления узла из словаря."""
        return cls(
            node_id=data['nodeId'],
            properties=data['properties']
        )


@dataclass
class UpdateNodeCompletePayload:
    node_id: str
    success: bool
    updated_properties: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразует полезную нагрузку в словарь."""
        return {
            'nodeId': self.node_id,
            'success': self.success,
            'updatedProperties': self.updated_properties
        }


@dataclass
class ErrorPayload:
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразует полезную нагрузку в словарь."""
        result = {
            'code': self.code,
            'message': self.message
        }
        if self.details:
            result['details'] = self.details
        return result


# Тип для обработчиков событий
EventHandler = Callable[[FigmaEvent], Awaitable[None]]


class EventProcessor:
    """
    Класс для обработки событий Figma.
    """
    
    def __init__(self, ws_server: WebSocketServer):
        """
        Инициализирует процессор событий.
        
        Args:
            ws_server: WebSocket-сервер
        """
        self.ws_server = ws_server
        self.handlers: Dict[FigmaEventType, List[EventHandler]] = {}
        
        # Регистрируем обработчики по умолчанию
        self._register_default_handlers()
        
        # Инициализируем метрики
        self.metrics = get_metrics_registry()
        
        logger.info("Event processor initialized")
    
    def _register_default_handlers(self) -> None:
        """Регистрирует обработчики по умолчанию."""
        self.register_handler(FigmaEventType.PING, self._handle_ping)
        self.register_handler(FigmaEventType.UPDATE_NODE_REQUEST, self._handle_update_node)
    
    def register_handler(self, event_type: FigmaEventType, handler: EventHandler) -> None:
        """
        Регистрирует обработчик для указанного типа события.
        
        Args:
            event_type: Тип события
            handler: Обработчик
        """
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        
        self.handlers[event_type].append(handler)
        logger.info(f"Registered handler for event type: {event_type}")
    
    async def process_event(self, websocket: Any, event_data: Dict[str, Any]) -> None:
        """
        Обрабатывает событие.
        
        Args:
            websocket: WebSocket-соединение
            event_data: Данные события
        """
        try:
            # Парсим событие
            event = FigmaEvent.from_dict(event_data)
            
            # Логируем получение события
            logger.info(f"Received event: {event.type} from {event.metadata.source} "
                        f"(correlation_id: {event.metadata.correlation_id}, "
                        f"session_id: {event.metadata.session_id})")
            
            # Увеличиваем счетчики метрик
            self.metrics.increment_counter("events.received", tags={"type": event.type})
            
            # Вызываем обработчики
            if event.type in self.handlers:
                for handler in self.handlers[event.type]:
                    try:
                        # Устанавливаем соединение в контекст обработчика
                        await handler(event)
                    except Exception as e:
                        logger.error(f"Error in event handler for {event.type}: {e}", exc_info=True)
                        await self.send_error(
                            websocket,
                            'handler_error',
                            f"Error processing event {event.type}: {str(e)}",
                            event.metadata.correlation_id,
                            event.metadata.session_id
                        )
            else:
                logger.warning(f"No handlers registered for event type: {event.type}")
                await self.send_error(
                    websocket,
                    'unknown_event_type',
                    f"No handlers registered for event type: {event.type}",
                    event.metadata.correlation_id,
                    event.metadata.session_id
                )
        
        except Exception as e:
            logger.error(f"Error processing event: {e}", exc_info=True)
            await self.send_error(
                websocket,
                'processing_error',
                f"Error processing event: {str(e)}"
            )
    
    async def send_event(self, websocket: Any, event: FigmaEvent) -> None:
        """
        Отправляет событие.
        
        Args:
            websocket: WebSocket-соединение
            event: Событие
        """
        try:
            event_dict = event.to_dict()
            logger.info(f"Sending event: {event.type} (correlation_id: {event.metadata.correlation_id})")
            await self.ws_server.send_message(websocket, json.dumps(event_dict))
            
            # Увеличиваем счетчик отправленных событий
            self.metrics.increment_counter("events.sent", tags={"type": event.type})
        except Exception as e:
            logger.error(f"Error sending event: {e}", exc_info=True)
    
    async def send_error(
        self,
        websocket: Any,
        code: str,
        message: str,
        correlation_id: Optional[str] = None,
        session_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Отправляет событие ошибки.
        
        Args:
            websocket: WebSocket-соединение
            code: Код ошибки
            message: Сообщение об ошибке
            correlation_id: Идентификатор корреляции
            session_id: Идентификатор сессии
            details: Дополнительные детали
        """
        error_payload = ErrorPayload(code=code, message=message, details=details)
        
        event = FigmaEvent(
            type=FigmaEventType.ERROR,
            payload=error_payload.to_dict(),
            metadata=EventMetadata(
                timestamp=datetime.datetime.now().isoformat(),
                source=EventSource.SERVER,
                correlation_id=correlation_id or str(uuid.uuid4()),
                session_id=session_id or 'server-session'
            )
        )
        
        await self.send_event(websocket, event)
        
        # Увеличиваем счетчик отправленных ошибок
        self.metrics.increment_counter("events.errors", tags={"type": "sent_error"})
        
        logger.warning(f"Sent error event: {message} (Code: {code})")
    
    def create_event(
        self,
        event_type: FigmaEventType,
        payload: Dict[str, Any],
        correlation_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> FigmaEvent:
        """
        Создает новое событие.
        
        Args:
            event_type: Тип события
            payload: Полезная нагрузка
            correlation_id: Идентификатор корреляции
            session_id: Идентификатор сессии
            
        Returns:
            Событие
        """
        return FigmaEvent(
            type=event_type,
            payload=payload,
            metadata=EventMetadata(
                timestamp=datetime.datetime.now().isoformat(),
                source=EventSource.SERVER,
                correlation_id=correlation_id or str(uuid.uuid4()),
                session_id=session_id or 'server-session'
            )
        )
    
    # Обработчики по умолчанию
    
    async def _handle_ping(self, event: FigmaEvent) -> None:
        """
        Обрабатывает событие PING.
        
        Args:
            event: Событие
        """
        logger.info(f"Ping received: {event.payload}")
        
        # Увеличиваем счетчик полученных пингов
        self.metrics.increment_counter("events.ping", tags={"source": event.metadata.source})
        
        # Создаем событие PONG
        pong_event = self.create_event(
            FigmaEventType.PONG,
            {
                'message': 'Server is alive',
                'received_at': event.payload.get('time'),
                'server_time': datetime.datetime.now().isoformat()
            },
            event.metadata.correlation_id,
            event.metadata.session_id
        )
        
        # Отправляем PONG
        for client in self.ws_server.clients:
            await self.send_event(client, pong_event)
    
    async def _handle_update_node(self, event: FigmaEvent) -> None:
        """
        Обрабатывает событие UPDATE_NODE_REQUEST.
        
        Args:
            event: Событие
        """
        try:
            logger.info(f"Update node request received: {event.payload}")
            
            # Преобразуем полезную нагрузку
            payload = UpdateNodeRequestPayload.from_dict(event.payload)
            
            # Отправляем событие PROGRESS
            progress_event = self.create_event(
                FigmaEventType.UPDATE_NODE_PROGRESS,
                {
                    'nodeId': payload.node_id,
                    'status': 'processing',
                    'message': 'Processing update request'
                },
                event.metadata.correlation_id,
                event.metadata.session_id
            )
            
            # Отправляем PROGRESS всем клиентам
            for client in self.ws_server.clients:
                await self.send_event(client, progress_event)
            
            # Имитируем обработку
            await asyncio.sleep(0.5)
            
            # Тут должен быть настоящий код обновления узла через Figma API
            # В данной имплементации мы просто возвращаем успешный результат
            
            # Создаем результат
            result = UpdateNodeCompletePayload(
                node_id=payload.node_id,
                success=True,
                updated_properties=payload.properties
            )
            
            # Отправляем событие COMPLETE
            complete_event = self.create_event(
                FigmaEventType.UPDATE_NODE_COMPLETE,
                result.to_dict(),
                event.metadata.correlation_id,
                event.metadata.session_id
            )
            
            # Отправляем COMPLETE всем клиентам
            for client in self.ws_server.clients:
                await self.send_event(client, complete_event)
            
            logger.info(f"Node update completed: {payload.node_id}")
        
        except Exception as e:
            logger.error(f"Error updating node: {e}", exc_info=True)
            
            # Создаем событие ERROR
            error_event = self.create_event(
                FigmaEventType.UPDATE_NODE_ERROR,
                {
                    'code': 'update_error',
                    'message': f"Error updating node: {str(e)}",
                    'details': {
                        'nodeId': event.payload.get('nodeId')
                    }
                },
                event.metadata.correlation_id,
                event.metadata.session_id
            )
            
            # Отправляем ERROR всем клиентам
            for client in self.ws_server.clients:
                await self.send_event(client, error_event)


# Функция для интеграции с existing WebSocketServer
def setup_event_processor(ws_server: WebSocketServer) -> EventProcessor:
    """
    Настраивает обработчик событий и интегрирует его с WebSocketServer.
    
    Args:
        ws_server: WebSocket-сервер
        
    Returns:
        Процессор событий
    """
    processor = EventProcessor(ws_server)
    
    # Регистрируем обработчик сообщений
    async def handle_message(websocket: Any, message: str) -> None:
        try:
            data = json.loads(message)
            
            # Проверяем, является ли сообщение событием Figma
            if 'type' in data and 'payload' in data and 'metadata' in data:
                await processor.process_event(websocket, data)
            else:
                # Если это обычное сообщение, обрабатываем его стандартным образом
                if 'type' in data and ws_server.has_handler(data['type']):
                    await ws_server.process_message(websocket, data)
                else:
                    await processor.send_error(
                        websocket,
                        'invalid_message',
                        'Message is not a valid Figma event or WebSocket message'
                    )
        except json.JSONDecodeError:
            logger.error(f"Error decoding JSON message: {message}")
            await processor.send_error(
                websocket,
                'invalid_json',
                'Message is not a valid JSON'
            )
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            await processor.send_error(
                websocket,
                'message_handling_error',
                f"Error handling message: {str(e)}"
            )
    
    # Заменяем обработчик сообщений в WebSocketServer
    ws_server.default_message_handler = handle_message
    
    logger.info("Event processor set up")
    return processor 