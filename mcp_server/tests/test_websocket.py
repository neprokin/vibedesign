import unittest
import asyncio
import json
import pytest
import websockets
import sys
import os
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
import time
import threading

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent.parent))

from tools.websocket import WebSocketServer


class TestWebSocketServer(unittest.TestCase):
    def setUp(self):
        """Настройка для тестов"""
        # Создаем экземпляр WebSocketServer для тестов с нестандартным портом
        self.test_port = 8766  # Используем нестандартный порт для тестов
        self.server = WebSocketServer(port=self.test_port)
        
        # Мокаем logger для тестов
        self.logger_patcher = patch('tools.websocket.logger')
        self.mock_logger = self.logger_patcher.start()
        
        # Запускаем сервер
        self.server.start()
        
        # Даем серверу время на запуск
        time.sleep(0.5)

    def tearDown(self):
        """Очистка после тестов"""
        # Останавливаем сервер, если он запущен
        if self.server._running:
            self.server.stop()
            time.sleep(0.5)  # Даем время на остановку
        
        # Останавливаем патч логгера
        self.logger_patcher.stop()

    def test_initialization(self):
        """Проверка корректной инициализации WebSocketServer"""
        server = WebSocketServer(host="example.com", port=8999)
        self.assertEqual(server.host, "example.com")
        self.assertEqual(server.port, 8999)
        self.assertEqual(server.clients, set())
        self.assertEqual(server.message_handlers, {})
        self.assertFalse(server._running)

    def test_register_handler(self):
        """Проверка регистрации обработчика сообщений"""
        # Создаем новый экземпляр для изоляции теста
        server = WebSocketServer()
        
        # Регистрируем обработчик
        @server.register_handler("TEST_MESSAGE")
        async def test_handler(websocket, payload):
            pass
        
        # Проверяем, что обработчик был зарегистрирован
        self.assertIn("TEST_MESSAGE", server.message_handlers)
        self.assertEqual(server.message_handlers["TEST_MESSAGE"], test_handler)

    def test_start_stop(self):
        """Проверка запуска и остановки сервера"""
        # Создаем новый экземпляр для изоляции теста
        server = WebSocketServer(port=8767)
        
        # Запускаем сервер
        server.start()
        time.sleep(0.5)  # Даем серверу время на запуск
        
        # Проверяем, что сервер запущен
        self.assertTrue(server._running)
        self.assertIsNotNone(server.thread)
        self.assertTrue(server.thread.is_alive())
        
        # Останавливаем сервер
        server.stop()
        time.sleep(0.5)  # Даем серверу время на остановку
        
        # Проверяем, что сервер остановлен
        self.assertFalse(server._running)

    def test_start_already_running(self):
        """Проверка попытки запуска уже запущенного сервера"""
        # Сервер уже запущен в setUp
        
        # Пытаемся запустить его снова
        self.server.start()
        
        # Проверяем, что вывод предупреждения
        self.mock_logger.warning.assert_called_with("WebSocket server is already running")

    def test_stop_not_running(self):
        """Проверка остановки не запущенного сервера"""
        # Создаем новый экземпляр для изоляции теста
        server = WebSocketServer()
        
        # Пытаемся остановить не запущенный сервер
        server.stop()
        
        # Проверяем, что вывод предупреждения
        self.mock_logger.warning.assert_called_with("WebSocket server is not running")

    def test_start_with_custom_port(self):
        """Проверка запуска сервера с указанием порта при запуске"""
        # Создаем новый экземпляр для изоляции теста
        server = WebSocketServer(port=8000)
        
        # Запускаем сервер с другим портом
        server.start(port=8001)
        time.sleep(0.5)
        
        # Проверяем, что порт был изменен
        self.assertEqual(server.port, 8001)
        
        # Останавливаем сервер
        server.stop()
        time.sleep(0.5)


# Асинхронные тесты для проверки обмена сообщениями
class TestWebSocketCommunication:
    @pytest.fixture
    async def server(self):
        """Фикстура для создания и запуска WebSocketServer"""
        server = WebSocketServer(port=8768)
        
        # Регистрируем тестовый обработчик
        @server.register_handler("ECHO")
        async def echo_handler(websocket, payload):
            await server.send_to_client(websocket, "ECHO_RESPONSE", payload)
        
        # Запускаем сервер
        server.start()
        yield server
        
        # Останавливаем сервер после тестов
        server.stop()
        await asyncio.sleep(0.5)  # Даем серверу время на остановку
    
    @pytest.mark.asyncio
    async def test_client_connection(self, server):
        """Проверка подключения клиента к серверу"""
        async with websockets.connect(f"ws://localhost:8768") as websocket:
            # Ожидаем приветственное сообщение
            response = await websocket.recv()
            data = json.loads(response)
            
            # Проверяем содержимое приветственного сообщения
            assert data["type"] == "WELCOME"
            assert "Connected to Figma MCP WebSocket Server" in data["payload"]["message"]
    
    @pytest.mark.asyncio
    async def test_echo_message(self, server):
        """Проверка отправки и получения эхо-сообщения"""
        async with websockets.connect(f"ws://localhost:8768") as websocket:
            # Пропускаем приветственное сообщение
            await websocket.recv()
            
            # Отправляем тестовое сообщение
            test_payload = {"text": "Hello, WebSocket!"}
            await websocket.send(json.dumps({
                "type": "ECHO",
                "payload": test_payload
            }))
            
            # Ожидаем ответное сообщение
            response = await websocket.recv()
            data = json.loads(response)
            
            # Проверяем ответ
            assert data["type"] == "ECHO_RESPONSE"
            assert data["payload"] == test_payload
    
    @pytest.mark.asyncio
    async def test_unknown_message_type(self, server):
        """Проверка отправки сообщения с неизвестным типом"""
        async with websockets.connect(f"ws://localhost:8768") as websocket:
            # Пропускаем приветственное сообщение
            await websocket.recv()
            
            # Отправляем сообщение с неизвестным типом
            await websocket.send(json.dumps({
                "type": "UNKNOWN_TYPE",
                "payload": {}
            }))
            
            # Ожидаем сообщение об ошибке
            response = await websocket.recv()
            data = json.loads(response)
            
            # Проверяем ответ об ошибке
            assert data["type"] == "ERROR"
            assert "Unknown message type" in data["payload"]["message"]
    
    @pytest.mark.asyncio
    async def test_invalid_json(self, server):
        """Проверка отправки некорректного JSON"""
        async with websockets.connect(f"ws://localhost:8768") as websocket:
            # Пропускаем приветственное сообщение
            await websocket.recv()
            
            # Отправляем некорректный JSON
            await websocket.send("{invalid json")
            
            # Ожидаем сообщение об ошибке
            response = await websocket.recv()
            data = json.loads(response)
            
            # Проверяем ответ об ошибке
            assert data["type"] == "ERROR"
            assert "Invalid JSON format" in data["payload"]["message"]


# Тесты для проверки методов broadcast и send_to_client
class TestWebSocketMessaging:
    @pytest.fixture
    def server_with_mock_clients(self):
        """Фикстура для создания сервера с моками клиентов"""
        server = WebSocketServer()
        
        # Создаем моки клиентов
        client1 = AsyncMock()
        client2 = AsyncMock()
        
        # Добавляем моки в список клиентов
        server.clients = {client1, client2}
        
        return server, client1, client2
    
    @pytest.mark.asyncio
    async def test_broadcast(self, server_with_mock_clients):
        """Проверка широковещательной отправки сообщения всем клиентам"""
        server, client1, client2 = server_with_mock_clients
        
        # Отправляем широковещательное сообщение
        test_payload = {"message": "Broadcast test"}
        await server.broadcast("TEST_BROADCAST", test_payload)
        
        # Формируем ожидаемое сообщение
        expected_message = json.dumps({"type": "TEST_BROADCAST", "payload": test_payload})
        
        # Проверяем, что сообщение было отправлено обоим клиентам
        client1.send.assert_called_once_with(expected_message)
        client2.send.assert_called_once_with(expected_message)
    
    @pytest.mark.asyncio
    async def test_broadcast_no_clients(self):
        """Проверка широковещательной отправки без подключенных клиентов"""
        server = WebSocketServer()
        
        # Пустой список клиентов
        server.clients = set()
        
        # Патчим логгер
        with patch('tools.websocket.logger') as mock_logger:
            # Отправляем широковещательное сообщение
            await server.broadcast("TEST_BROADCAST", {"message": "No clients"})
            
            # Проверяем предупреждение в логе
            mock_logger.warning.assert_called_once_with(
                "No clients connected to broadcast message: TEST_BROADCAST"
            )
    
    @pytest.mark.asyncio
    async def test_send_to_client(self, server_with_mock_clients):
        """Проверка отправки сообщения конкретному клиенту"""
        server, client1, client2 = server_with_mock_clients
        
        # Отправляем сообщение только первому клиенту
        test_payload = {"message": "Individual client test"}
        await server.send_to_client(client1, "TEST_INDIVIDUAL", test_payload)
        
        # Формируем ожидаемое сообщение
        expected_message = json.dumps({"type": "TEST_INDIVIDUAL", "payload": test_payload})
        
        # Проверяем, что сообщение было отправлено только первому клиенту
        client1.send.assert_called_once_with(expected_message)
        client2.send.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_send_to_client_error(self, server_with_mock_clients):
        """Проверка обработки ошибки при отправке сообщения клиенту"""
        server, client1, _ = server_with_mock_clients
        
        # Настраиваем клиент на выброс исключения при отправке
        client1.send.side_effect = Exception("Connection error")
        
        # Патчим логгер
        with patch('tools.websocket.logger') as mock_logger:
            # Отправляем сообщение клиенту с ошибкой
            await server.send_to_client(client1, "TEST_ERROR", {"message": "Error test"})
            
            # Проверяем сообщение об ошибке в логе
            mock_logger.error.assert_called_once_with(
                "Error sending message to client: Connection error"
            )


if __name__ == '__main__':
    unittest.main() 