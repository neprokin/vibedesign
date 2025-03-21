import asyncio
import os
import sys
from pathlib import Path

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent))

from tools.prompt_manager import PromptManager
from tools.websocket import WebSocketServer


def test_prompt_manager():
    """Тест функциональности менеджера промптов"""
    print("\n=== Тест менеджера промптов ===")
    
    # Создаем экземпляр PromptManager
    prompt_manager = PromptManager()
    
    # Получаем список доступных шаблонов
    templates = prompt_manager.list_templates()
    
    # Выводим результат
    print(f"Найдено шаблонов: {len(templates)}")
    for template in templates:
        print(f"- {template['name']}: {template['description'][:50]}...")


async def test_websocket_server():
    """Тест функциональности WebSocket сервера"""
    print("\n=== Тест WebSocket сервера ===")
    
    # Создаем сервер с нестандартным портом для теста
    server = WebSocketServer(port=8771)
    
    # Регистрируем тестовый обработчик
    @server.register_handler("TEST")
    async def handle_test(websocket, payload):
        print(f"Обработан запрос с payload: {payload}")
        await server.send_to_client(websocket, "TEST_RESPONSE", {"message": "Тестовый ответ"})
    
    # Запускаем сервер
    server.start()
    print(f"WebSocket сервер запущен на порту {server.port}")
    
    # Ждем немного, а затем останавливаем сервер
    await asyncio.sleep(2)
    server.stop()
    print("WebSocket сервер остановлен")


async def main():
    """Запуск всех тестов"""
    print("=== Запуск базовых тестов MCP-сервера ===")
    
    try:
        # Тест менеджера промптов
        test_prompt_manager()
        
        # Тест WebSocket сервера
        await test_websocket_server()
        
        print("\n=== Все тесты успешно выполнены ===")
    except Exception as e:
        print(f"\n❌ Ошибка при выполнении тестов: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main()) 