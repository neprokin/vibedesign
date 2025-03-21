import asyncio
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
import requests
import aiohttp

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent))

# Патчим переменные окружения для тестирования
os.environ["OPENAI_API_KEY"] = "test_openai_api_key"
os.environ["FIGMA_ACCESS_TOKEN"] = "test_figma_access_token"

# Импортируем необходимые модули
from tools.figma_api import FigmaAPI
from tools.llm_factory import LLMFactory
from tools.prompt_manager import PromptManager
from tools.websocket import WebSocketServer


async def test_figma_api_mock():
    """Тест функциональности Figma API с моком"""
    print("\n=== Тест Figma API ===")
    
    # Создаем мок для ClientSession.get
    session_mock = AsyncMock()
    response_mock = AsyncMock()
    response_mock.raise_for_status = AsyncMock()
    response_mock.json.return_value = {
        "name": "Test Figma File",
        "document": {
            "children": [
                {
                    "id": "frame1",
                    "name": "Test Frame",
                    "type": "FRAME"
                }
            ]
        }
    }
    session_mock.get.return_value.__aenter__.return_value = response_mock
    
    # Патчим aiohttp.ClientSession
    with patch('aiohttp.ClientSession') as mock_session:
        mock_session.return_value.__aenter__.return_value = session_mock
        
        # Создаем экземпляр FigmaAPI
        figma_api = FigmaAPI(access_token="test_figma_token")
        
        # Получаем тестовые данные
        file_data = await figma_api.get_file("test_file_id")
        
        # Выводим результат
        print(f"Figma API успешно вернул данные для файла: {file_data['name']}")
        print(f"Содержит фреймов: {len(file_data['document']['children'])}")


async def test_llm_adapter_mock():
    """Тест функциональности LLM адаптера с моком"""
    print("\n=== Тест LLM адаптера ===")
    
    # Создаем мок для OpenAI API
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Это тестовый ответ от LLM."
    
    # Патчим модуль openai
    with patch('openai.ChatCompletion.acreate', new=AsyncMock(return_value=mock_response)):
        
        # Создаем экземпляр LLM адаптера
        llm_adapter = LLMFactory.create_adapter("openai")
        
        # Отправляем тестовый промпт
        response = await llm_adapter.send_prompt(
            prompt="Тестовый промпт",
            system_message="Вы тестовый ассистент",
            temperature=0.7
        )
        
        # Выводим результат
        print(f"LLM адаптер успешно вернул ответ: {response}")


async def test_prompt_manager():
    """Тест функциональности менеджера промптов"""
    print("\n=== Тест менеджера промптов ===")
    
    # Создаем экземпляр PromptManager
    prompt_manager = PromptManager()
    
    # Получаем список доступных шаблонов
    templates = prompt_manager.list_templates()
    
    # Выводим результат
    print(f"Найдено шаблонов: {len(templates)}")
    for template in templates:
        print(f"- {template['name']}: {template['description']}")


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
    print("=== Запуск тестов MCP-сервера ===")
    
    try:
        # Тест Figma API
        await test_figma_api_mock()
        
        # Тест LLM адаптера
        await test_llm_adapter_mock()
        
        # Тест менеджера промптов
        await test_prompt_manager()
        
        # Тест WebSocket сервера
        await test_websocket_server()
        
        print("\n=== Все тесты успешно выполнены ===")
    except Exception as e:
        print(f"\n❌ Ошибка при выполнении тестов: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main()) 