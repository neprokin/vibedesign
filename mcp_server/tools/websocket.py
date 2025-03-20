import json
import asyncio
import websockets
from typing import Dict, Any, Callable, Set

class WebSocketServer:
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.message_handlers: Dict[str, Callable] = {}

    def register_handler(self, message_type: str, handler: Callable):
        """Регистрация обработчика для определенного типа сообщения"""
        self.message_handlers[message_type] = handler

    async def handle_message(self, websocket: websockets.WebSocketServerProtocol, message: str):
        """Обработка входящего сообщения"""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            
            if message_type in self.message_handlers:
                await self.message_handlers[message_type](websocket, data.get("payload", {}))
            else:
                await websocket.send(json.dumps({
                    "type": "error",
                    "payload": {"message": f"Unknown message type: {message_type}"}
                }))
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "type": "error",
                "payload": {"message": "Invalid JSON format"}
            }))

    async def handler(self, websocket: websockets.WebSocketServerProtocol, path: str):
        """Обработчик WebSocket соединения"""
        self.clients.add(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        finally:
            self.clients.remove(websocket)

    async def broadcast(self, message_type: str, payload: Dict[str, Any]):
        """Отправка сообщения всем подключенным клиентам"""
        message = json.dumps({"type": message_type, "payload": payload})
        if self.clients:
            await asyncio.gather(
                *[client.send(message) for client in self.clients]
            )

    async def start(self):
        """Запуск WebSocket сервера"""
        server = await websockets.serve(self.handler, self.host, self.port)
        print(f"WebSocket server started on ws://{self.host}:{self.port}")
        await server.wait_closed() 