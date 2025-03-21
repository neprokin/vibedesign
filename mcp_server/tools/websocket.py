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

    async def handler(self, websocket: websockets.WebSocketServerProtocol):
        """
        Обработчик WebSocket соединения
        
        Args:
            websocket: WebSocket соединение
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
                    "version": "1.0"
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
        message = json.dumps({"type": message_type, "payload": payload})
        
        if not self.clients:
            logger.warning(f"No clients connected to broadcast message: {message_type}")
            return
            
        try:
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
            logger.debug(f"Broadcasted message to {len(self.clients)} clients: {message_type}")
        except Exception as e:
            logger.error(f"Error broadcasting message: {e}")

    async def send_to_client(self, websocket: websockets.WebSocketServerProtocol, 
                           message_type: str, payload: Dict[str, Any]):
        """
        Отправка сообщения конкретному клиенту
        
        Args:
            websocket: WebSocket соединение
            message_type: Тип сообщения
            payload: Данные сообщения
        """
        message = json.dumps({"type": message_type, "payload": payload})
        try:
            await websocket.send(message)
            logger.debug(f"Sent message to client: {message_type}")
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")

    async def _run_server(self):
        """Внутренний метод для запуска сервера в асинхронном режиме"""
        try:
            self.server = await websockets.serve(self.handler, self.host, self.port)
            self._running = True
            logger.info(f"WebSocket server started on ws://{self.host}:{self.port}")
            await self.server.wait_closed()
        except Exception as e:
            logger.error(f"Error starting WebSocket server: {e}")
            self._running = False

    def _run_in_thread(self):
        """Запуск сервера в отдельном потоке"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self.server_task = self.loop.create_task(self._run_server())
        self.loop.run_forever()

    def start(self, port: Optional[int] = None):
        """
        Запуск WebSocket сервера в отдельном потоке
        
        Args:
            port: Порт для сервера (если отличается от порта, указанного при инициализации)
        """
        if self._running:
            logger.warning("WebSocket server is already running")
            return
            
        if port is not None:
            self.port = port
            
        self.thread = threading.Thread(target=self._run_in_thread, daemon=True)
        self.thread.start()
        
        # Ждем небольшую паузу, чтобы сервер успел запуститься
        import time
        time.sleep(0.5)
        
        return self

    def stop(self):
        """Остановка WebSocket сервера"""
        if not self._running:
            logger.warning("WebSocket server is not running")
            return
            
        async def shutdown():
            self.server.close()
            await self.server.wait_closed()
            
        if self.loop:
            asyncio.run_coroutine_threadsafe(shutdown(), self.loop)
            self.loop.call_soon_threadsafe(self.loop.stop)
            
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5.0)
            
        self._running = False
        logger.info("WebSocket server stopped") 