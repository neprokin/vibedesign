import json
import asyncio
import websockets
import threading
from typing import Dict, Any, Callable, Set, Optional
from .logger import logger

class WebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.message_handlers: Dict[str, Callable] = {}
        self.server = None
        self.server_task = None
        self.loop = None
        self.thread = None
        self._running = False

    def register_handler(self, message_type: str):
        """
        Декоратор для регистрации обработчика для определенного типа сообщения
        
        Args:
            message_type: Тип сообщения для обработки
        """
        def decorator(handler: Callable):
            self.message_handlers[message_type] = handler
            return handler
        return decorator

    async def handle_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """
        Обработка входящего сообщения
        
        Args:
            websocket: WebSocket соединение
            message: Полученное сообщение в JSON-формате
        """
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type in self.message_handlers:
                await self.message_handlers[message_type](websocket, data.get("payload", {}))
            else:
                await websocket.send(json.dumps({
                    "type": "ERROR",
                    "payload": {"message": f"Unknown message type: {message_type}"}
                }))
                logger.warning(f"Received unknown message type: {message_type}")
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "type": "ERROR",
                "payload": {"message": "Invalid JSON format"}
            }))
            logger.error(f"Received invalid JSON: {message}")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            try:
                await websocket.send(json.dumps({
                    "type": "ERROR",
                    "payload": {"message": f"Server error: {str(e)}"}
                }))
            except:
                pass

    async def handler(self, websocket: websockets.WebSocketServerProtocol, path: str = "/"):
        """
        Обработчик WebSocket соединения
        
        Args:
            websocket: WebSocket соединение
            path: Путь WebSocket соединения
        """
        client_info = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        logger.info(f"Client connected: {client_info}")
        
        self.clients.add(websocket)
        try:
            # Отправляем приветственное сообщение
            await websocket.send(json.dumps({
                "type": "WELCOME",
                "payload": {
                    "message": "Connected to Figma MCP WebSocket Server",
                    "version": "1.0",
                    "path": path
                }
            }))
            
            # Обрабатываем входящие сообщения
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {client_info}")
        except Exception as e:
            logger.error(f"Error in WebSocket handler: {e}")
        finally:
            self.clients.remove(websocket)

    async def broadcast(self, message_type: str, payload: Dict[str, Any]):
        """
        Отправка сообщения всем подключенным клиентам
        
        Args:
            message_type: Тип сообщения
            payload: Данные сообщения
        """
        if not self.clients:
            return
            
        message = json.dumps({
            "type": message_type,
            "payload": payload
        })
        
        disconnected_clients = set()
        for client in self.clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected_clients.add(client)
                
        # Удаляем отключенных клиентов
        self.clients -= disconnected_clients

    async def send_to_client(self, websocket: websockets.WebSocketServerProtocol, 
                           message_type: str, payload: Dict[str, Any]):
        """
        Отправка сообщения конкретному клиенту
        
        Args:
            websocket: WebSocket соединение клиента
            message_type: Тип сообщения
            payload: Данные сообщения
        """
        try:
            message = json.dumps({
                "type": message_type,
                "payload": payload
            })
            await websocket.send(message)
        except websockets.exceptions.ConnectionClosed:
            self.clients.remove(websocket)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")

    async def _run_server(self):
        """
        Запуск WebSocket сервера
        """
        try:
            async with websockets.serve(self.handler, self.host, self.port):
                logger.info(f"server listening on {self.host}:{self.port}")
                logger.info(f"WebSocket server started on ws://localhost:{self.port}")
                await asyncio.Future()  # run forever
        except Exception as e:
            logger.error(f"Error starting WebSocket server: {e}")
            raise

    def _run_in_thread(self):
        """
        Запуск сервера в отдельном потоке
        """
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._run_server())

    def start(self, port: Optional[int] = None):
        """
        Запуск WebSocket сервера в отдельном потоке
        
        Args:
            port: Порт для запуска сервера (опционально)
        """
        if self._running:
            return
            
        if port is not None:
            self.port = port
            
        self._running = True
        self.thread = threading.Thread(target=self._run_in_thread)
        self.thread.daemon = True
        self.thread.start()

    def stop(self):
        """
        Остановка WebSocket сервера
        """
        if not self._running:
            return
            
        self._running = False
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)
        if self.thread:
            self.thread.join()
        self.clients.clear() 