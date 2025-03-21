import unittest
import pytest
import asyncio
import time
import statistics
import json
import sys
import os
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent.parent))

from tools.figma_api import FigmaAPI
from tools.llm_adapter import LLMAdapter
from tools.openai_adapter import OpenAIAdapter
from tools.llm_factory import LLMFactory
from tools.prompt_manager import PromptManager
from tools.websocket import WebSocketServer


class PerformanceTestCase:
    """Базовый класс для тестов производительности"""
    
    def __init__(self, name, iterations=10):
        self.name = name
        self.iterations = iterations
        self.execution_times = []
    
    async def setup(self):
        """Настройка перед запуском теста"""
        pass
    
    async def teardown(self):
        """Очистка после завершения теста"""
        pass
    
    async def run_iteration(self):
        """Запуск одной итерации теста"""
        raise NotImplementedError("Subclasses must implement this method")
    
    async def run(self):
        """Запуск всех итераций теста и сбор метрик"""
        await self.setup()
        
        print(f"\nRunning performance test: {self.name}")
        print(f"Iterations: {self.iterations}")
        
        for i in range(self.iterations):
            start_time = time.time()
            await self.run_iteration()
            end_time = time.time()
            
            execution_time = (end_time - start_time) * 1000  # в миллисекундах
            self.execution_times.append(execution_time)
            
            print(f"  Iteration {i+1}/{self.iterations}: {execution_time:.2f} ms")
        
        await self.teardown()
        
        # Вычисляем статистику
        avg_time = statistics.mean(self.execution_times)
        median_time = statistics.median(self.execution_times)
        min_time = min(self.execution_times)
        max_time = max(self.execution_times)
        if len(self.execution_times) > 1:
            stdev = statistics.stdev(self.execution_times)
        else:
            stdev = 0
        
        print("\nPerformance results:")
        print(f"  Average: {avg_time:.2f} ms")
        print(f"  Median: {median_time:.2f} ms")
        print(f"  Min: {min_time:.2f} ms")
        print(f"  Max: {max_time:.2f} ms")
        print(f"  StdDev: {stdev:.2f} ms")
        
        return {
            "name": self.name,
            "iterations": self.iterations,
            "average_ms": avg_time,
            "median_ms": median_time,
            "min_ms": min_time,
            "max_ms": max_time,
            "stdev_ms": stdev,
            "raw_times_ms": self.execution_times
        }


class PromptManagerPerformanceTest(PerformanceTestCase):
    """Тест производительности для PromptManager"""
    
    async def setup(self):
        """Настройка временных шаблонов для теста"""
        self.temp_dir = Path("temp_test_templates")
        self.temp_dir.mkdir(exist_ok=True)
        
        # Создаем тестовый шаблон
        template_content = """
{# 
{
  "description": "Test template for performance testing",
  "parameters": {
    "name": "string",
    "items": "array"
  },
  "category": "performance_test"
}
#}

Hello, {{ name }}!
{% for item in items %}
- {{ item }}
{% endfor %}
"""
        template_path = self.temp_dir / "test_template.j2"
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(template_content)
        
        # Создаем экземпляр PromptManager
        self.prompt_manager = PromptManager(templates_dir=str(self.temp_dir))
        
        # Подготавливаем тестовые данные
        self.test_context = {
            "name": "Performance Test",
            "items": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"]
        }
    
    async def teardown(self):
        """Удаляем временные файлы"""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    async def run_iteration(self):
        """Запуск одной итерации теста"""
        return self.prompt_manager.render_template("test_template.j2", self.test_context)


class WebSocketPerformanceTest(PerformanceTestCase):
    """Тест производительности для WebSocket сервера"""
    
    async def setup(self):
        """Запуск WebSocket сервера"""
        self.server = WebSocketServer(port=8770)
        
        # Регистрируем простой обработчик для теста
        @self.server.register_handler("PING")
        async def handle_ping(websocket, payload):
            await self.server.send_to_client(websocket, "PONG", {"timestamp": time.time()})
        
        # Запускаем сервер
        self.server.start()
        
        # Даем серверу время на запуск
        await asyncio.sleep(0.5)
        
        # Создаем клиентское соединение
        import websockets
        self.client = await websockets.connect("ws://localhost:8770")
        
        # Пропускаем приветственное сообщение
        await self.client.recv()
    
    async def teardown(self):
        """Остановка WebSocket сервера"""
        # Закрываем клиентское соединение
        if hasattr(self, 'client'):
            await self.client.close()
        
        # Останавливаем сервер
        if hasattr(self, 'server'):
            self.server.stop()
            
        # Даем серверу время на остановку
        await asyncio.sleep(0.5)
    
    async def run_iteration(self):
        """Запуск одной итерации теста"""
        # Отправляем PING
        await self.client.send(json.dumps({
            "type": "PING",
            "payload": {"timestamp": time.time()}
        }))
        
        # Получаем PONG
        response = await self.client.recv()
        return json.loads(response)


class LLMAdapterMockPerformanceTest(PerformanceTestCase):
    """Тест производительности для LLM адаптера с моком"""
    
    async def setup(self):
        """Настройка мока LLM адаптера"""
        # Создаем мок для OpenAI адаптера
        self.openai_patcher = patch('tools.openai_adapter.openai')
        self.mock_openai = self.openai_patcher.start()
        
        # Настраиваем мок для быстрого ответа
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "This is a mock response for performance testing"
        self.mock_openai.ChatCompletion.acreate.return_value = mock_response
        
        # Создаем экземпляр адаптера
        self.adapter = OpenAIAdapter(api_key="test_key", default_model="gpt-3.5-turbo")
        
        # Тестовый промпт
        self.test_prompt = "Generate a performance test response"
    
    async def teardown(self):
        """Очистка после теста"""
        self.openai_patcher.stop()
    
    async def run_iteration(self):
        """Запуск одной итерации теста"""
        return await self.adapter.send_prompt(
            prompt=self.test_prompt,
            system_message="You are a performance testing assistant",
            temperature=0.7,
            max_tokens=100
        )


class FigmaAPIMockPerformanceTest(PerformanceTestCase):
    """Тест производительности для Figma API с моком"""
    
    async def setup(self):
        """Настройка мока Figma API"""
        # Патчим requests.get для предотвращения реальных запросов
        self.requests_patcher = patch('tools.figma_api.requests.get')
        self.mock_requests = self.requests_patcher.start()
        
        # Настраиваем мок для быстрого ответа
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "name": "Performance Test File",
            "document": {
                "children": [
                    {
                        "id": "node1",
                        "name": "Test Node",
                        "type": "FRAME"
                    }
                ]
            }
        }
        self.mock_requests.return_value = mock_response
        
        # Создаем экземпляр Figma API
        self.figma_api = FigmaAPI(access_token="test_token")
    
    async def teardown(self):
        """Очистка после теста"""
        self.requests_patcher.stop()
    
    async def run_iteration(self):
        """Запуск одной итерации теста"""
        return self.figma_api.get_file("test_file_id")


class JSONParsingPerformanceTest(PerformanceTestCase):
    """Тест производительности для парсинга больших JSON объектов"""
    
    async def setup(self):
        """Подготовка большого JSON объекта"""
        # Создаем большой JSON объект, имитирующий сложный ответ Figma API
        self.test_json = {
            "document": {
                "children": []
            },
            "components": {},
            "styles": {}
        }
        
        # Добавляем много фреймов и компонентов
        for i in range(500):  # 500 фреймов
            frame = {
                "id": f"frame{i}",
                "name": f"Frame {i}",
                "type": "FRAME",
                "children": []
            }
            
            # Добавляем дочерние элементы в каждый фрейм
            for j in range(20):  # 20 элементов в каждом фрейме
                child = {
                    "id": f"element{i}_{j}",
                    "name": f"Element {j} in Frame {i}",
                    "type": ["RECTANGLE", "TEXT", "COMPONENT"][j % 3],
                    "fills": [
                        {
                            "type": "SOLID",
                            "color": {"r": j/20, "g": i/500, "b": 0.5}
                        }
                    ],
                    "strokes": [],
                    "effects": []
                }
                frame["children"].append(child)
                
                # Добавляем компонент
                self.test_json["components"][f"component{i}_{j}"] = {
                    "key": f"key{i}_{j}",
                    "name": f"Component {i}_{j}",
                    "description": f"Description for component {i}_{j}"
                }
            
            self.test_json["document"]["children"].append(frame)
        
        # Преобразуем в строку
        self.json_string = json.dumps(self.test_json)
    
    async def run_iteration(self):
        """Запуск одной итерации теста"""
        # Парсим JSON
        parsed = json.loads(self.json_string)
        
        # Выполняем некоторую обработку для имитации реальной работы
        count = 0
        for frame in parsed["document"]["children"]:
            for child in frame["children"]:
                if child["type"] == "RECTANGLE":
                    count += 1
        
        return count


@pytest.mark.asyncio
async def test_prompt_manager_performance():
    """Тест производительности для PromptManager"""
    test = PromptManagerPerformanceTest("PromptManager.render_template", iterations=100)
    results = await test.run()
    
    # Проверяем, что среднее время ниже порогового значения
    assert results["average_ms"] < 10.0, f"PromptManager.render_template is too slow: {results['average_ms']:.2f} ms"


@pytest.mark.asyncio
async def test_websocket_performance():
    """Тест производительности для WebSocket сервера"""
    test = WebSocketPerformanceTest("WebSocket.ping-pong", iterations=50)
    results = await test.run()
    
    # Проверяем, что среднее время ниже порогового значения
    assert results["average_ms"] < 20.0, f"WebSocket ping-pong is too slow: {results['average_ms']:.2f} ms"


@pytest.mark.asyncio
async def test_llm_adapter_mock_performance():
    """Тест производительности для LLM адаптера с моком"""
    test = LLMAdapterMockPerformanceTest("LLMAdapter.send_prompt (mocked)", iterations=50)
    results = await test.run()
    
    # Проверяем, что среднее время ниже порогового значения
    assert results["average_ms"] < 15.0, f"LLMAdapter.send_prompt is too slow: {results['average_ms']:.2f} ms"


@pytest.mark.asyncio
async def test_figma_api_mock_performance():
    """Тест производительности для Figma API с моком"""
    test = FigmaAPIMockPerformanceTest("FigmaAPI.get_file (mocked)", iterations=50)
    results = await test.run()
    
    # Проверяем, что среднее время ниже порогового значения
    assert results["average_ms"] < 10.0, f"FigmaAPI.get_file is too slow: {results['average_ms']:.2f} ms"


@pytest.mark.asyncio
async def test_json_parsing_performance():
    """Тест производительности для парсинга больших JSON объектов"""
    test = JSONParsingPerformanceTest("Large JSON parsing", iterations=20)
    results = await test.run()
    
    # Проверяем, что среднее время ниже порогового значения (это сложная операция, поэтому порог выше)
    assert results["average_ms"] < 200.0, f"JSON parsing is too slow: {results['average_ms']:.2f} ms"


if __name__ == '__main__':
    pytest.main(["-v", "test_performance.py"]) 