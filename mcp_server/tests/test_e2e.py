import unittest
import asyncio
import pytest
import os
import sys
import json
import websockets
import time
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
import threading

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent.parent))

from tools.figma_api import FigmaAPI
from tools.llm_factory import LLMFactory
from tools.websocket import WebSocketServer
from tools.prompt_manager import PromptManager
from server import MCPServer


# Создаем моки для внешних зависимостей (Figma API и LLM)
@pytest.fixture
def mock_figma_api():
    """Фикстура для создания мока Figma API"""
    with patch('tools.figma_api.FigmaAPI') as MockFigmaAPI:
        figma_instance = MockFigmaAPI.return_value
        
        # Настройка мока get_file
        async def mock_get_file(file_id):
            return {
                "name": "Test Figma File",
                "document": {
                    "children": [
                        {
                            "id": "frame1",
                            "name": "Frame 1",
                            "type": "FRAME",
                            "children": [
                                {
                                    "id": "rect1",
                                    "name": "Rectangle 1",
                                    "type": "RECTANGLE",
                                    "fills": [{"type": "SOLID", "color": {"r": 1, "g": 0, "b": 0}}]
                                }
                            ]
                        }
                    ]
                }
            }
        figma_instance.get_file = mock_get_file
        
        # Настройка мока get_node
        async def mock_get_node(file_id, node_id):
            return {
                "id": node_id,
                "name": f"Node {node_id}",
                "type": "FRAME",
                "fills": [{"type": "SOLID", "color": {"r": 0, "g": 0.5, "b": 1}}]
            }
        figma_instance.get_node = mock_get_node
        
        return figma_instance


@pytest.fixture
def mock_llm_adapter():
    """Фикстура для создания мока LLM адаптера"""
    with patch('tools.llm_factory.LLMFactory.create_adapter') as mock_factory:
        adapter = AsyncMock()
        
        # Настройка мока analyze_design
        async def mock_analyze_design(design_data, criteria=None):
            return {
                "analysis": "This is a mock design analysis",
                "suggestions": [
                    "Use more consistent colors",
                    "Improve text contrast",
                    "Consider accessibility standards"
                ]
            }
        adapter.analyze_design = mock_analyze_design
        
        # Настройка мока generate_json
        async def mock_generate_json(prompt, schema):
            if "responsive_layout" in prompt.lower():
                return {
                    "layout": {
                        "mobile": {
                            "width": 375,
                            "components": ["Header", "Content", "Footer"]
                        }
                    },
                    "modifications": [
                        "Stack content vertically",
                        "Reduce font sizes",
                        "Hide secondary elements"
                    ]
                }
            elif "code" in prompt.lower():
                return {
                    "code": "<div className='container'>\n  <h1>Hello World</h1>\n</div>",
                    "language": "jsx",
                    "explanation": "Simple React component"
                }
            return {"result": "Generic mock response"}
        adapter.generate_json = mock_generate_json
        
        # Настройка мока send_prompt
        async def mock_send_prompt(prompt, system_message="", temperature=0.7, max_tokens=None):
            return f"Mock response for prompt: {prompt[:30]}..."
        adapter.send_prompt = mock_send_prompt
        
        mock_factory.return_value = adapter
        return adapter


@pytest.fixture
def websocket_server():
    """Фикстура для создания и запуска WebSocket сервера"""
    # Инициализируем сервер на отдельном порту для тестов
    server = WebSocketServer(port=8769)
    
    # Регистрируем обработчики для тестовых сообщений
    @server.register_handler("ANALYZE_DESIGN")
    async def handle_analyze_design(websocket, payload):
        # Мокируем ответ от LLM
        response = {
            "analysis": "E2E test analysis",
            "suggestions": ["Suggestion 1", "Suggestion 2"]
        }
        await server.send_to_client(websocket, "ANALYSIS_RESULT", response)
    
    @server.register_handler("GENERATE_CODE")
    async def handle_generate_code(websocket, payload):
        # Мокируем генерацию кода
        response = {
            "code": "<div>Test Component</div>",
            "language": "jsx"
        }
        await server.send_to_client(websocket, "CODE_GENERATED", response)
    
    # Запускаем сервер
    server.start()
    time.sleep(0.5)  # Даем серверу время на запуск
    
    yield server
    
    # Останавливаем сервер после тестов
    server.stop()
    time.sleep(0.5)  # Даем серверу время на остановку


# E2E тест для анализа дизайна
@pytest.mark.asyncio
async def test_e2e_analyze_design(mock_figma_api, mock_llm_adapter, websocket_server):
    """E2E тест для сценария анализа дизайна"""
    # Подключаемся к WebSocket серверу
    async with websockets.connect("ws://localhost:8769") as websocket:
        # Пропускаем приветственное сообщение
        await websocket.recv()
        
        # Отправляем запрос на анализ дизайна
        await websocket.send(json.dumps({
            "type": "ANALYZE_DESIGN",
            "payload": {
                "file_id": "test_file",
                "node_id": "test_node",
                "criteria": ["layout", "colors", "typography"]
            }
        }))
        
        # Получаем результат анализа
        response = await websocket.recv()
        data = json.loads(response)
        
        # Проверяем результат
        assert data["type"] == "ANALYSIS_RESULT"
        assert "analysis" in data["payload"]
        assert "suggestions" in data["payload"]
        assert len(data["payload"]["suggestions"]) == 2


# E2E тест для генерации кода
@pytest.mark.asyncio
async def test_e2e_generate_code(mock_figma_api, mock_llm_adapter, websocket_server):
    """E2E тест для сценария генерации кода"""
    # Подключаемся к WebSocket серверу
    async with websockets.connect("ws://localhost:8769") as websocket:
        # Пропускаем приветственное сообщение
        await websocket.recv()
        
        # Отправляем запрос на генерацию кода
        await websocket.send(json.dumps({
            "type": "GENERATE_CODE",
            "payload": {
                "file_id": "test_file",
                "node_id": "test_node",
                "framework": "react",
                "style_framework": "tailwind"
            }
        }))
        
        # Получаем результат генерации
        response = await websocket.recv()
        data = json.loads(response)
        
        # Проверяем результат
        assert data["type"] == "CODE_GENERATED"
        assert "code" in data["payload"]
        assert "language" in data["payload"]
        assert data["payload"]["language"] == "jsx"


# Полный E2E тест с MCP сервером и всеми компонентами
class TestFullE2EFlow:
    @pytest.fixture
    def setup_mcp_server(self):
        """Фикстура для настройки MCP сервера с моками внешних зависимостей"""
        # Патчим FigmaAPI
        figma_patcher = patch('server.FigmaAPI')
        mock_figma = figma_patcher.start()
        
        # Настройка моков для Figma API
        mock_figma_instance = MagicMock()
        
        def mock_get_file(file_id):
            return {
                "name": "Test Figma File",
                "document": {"children": []}
            }
        mock_figma_instance.get_file = mock_get_file
        
        mock_figma.return_value = mock_figma_instance
        
        # Патчим LLMFactory
        llm_patcher = patch('server.LLMFactory')
        mock_llm_factory = llm_patcher.start()
        
        mock_adapter = MagicMock()
        mock_adapter.analyze_design.return_value = {
            "analysis": "Full E2E test analysis",
            "suggestions": ["Full test suggestion 1", "Full test suggestion 2"]
        }
        mock_llm_factory.create_adapter.return_value = mock_adapter
        
        # Запускаем модифицированный MCP-сервер (без запуска реального сервера)
        # Здесь мы создаем экземпляр, но не запускаем его полностью
        with patch('server.FastMCP'):
            server = MCPServer()
            server.figma_api = mock_figma_instance
            server.llm_adapter = mock_adapter
        
        yield server, mock_figma_instance, mock_adapter
        
        # Останавливаем патчи
        figma_patcher.stop()
        llm_patcher.stop()
    
    @pytest.mark.asyncio
    async def test_full_analyze_design_flow(self, setup_mcp_server):
        """Полный E2E тест для рабочего процесса анализа дизайна"""
        server, mock_figma, mock_adapter = setup_mcp_server
        
        # Патчим метод сервера для анализа дизайна
        with patch.object(server, 'analyze_design', wraps=server.analyze_design) as mock_analyze:
            # Вызываем метод анализа дизайна
            result = await server.analyze_design(
                file_id="test_file_id",
                node_id="test_node_id",
                criteria=["layout", "colors"]
            )
            
            # Проверяем вызов метода с правильными параметрами
            mock_analyze.assert_called_once_with(
                file_id="test_file_id",
                node_id="test_node_id",
                criteria=["layout", "colors"]
            )
            
            # Проверяем результат
            assert "analysis" in result
            assert "suggestions" in result
            assert len(result["suggestions"]) >= 2
    
    @pytest.mark.asyncio
    async def test_full_generate_code_flow(self, setup_mcp_server):
        """Полный E2E тест для рабочего процесса генерации кода"""
        server, mock_figma, mock_adapter = setup_mcp_server
        
        # Настройка мока для генерации кода
        mock_adapter.generate_json.return_value = {
            "code": "<div>Full E2E Test Component</div>",
            "language": "jsx",
            "components": ["Header", "Content"]
        }
        
        # Патчим метод сервера для генерации кода
        with patch.object(server, 'generate_code', wraps=server.generate_code) as mock_generate:
            # Вызываем метод генерации кода
            result = await server.generate_code(
                file_id="test_file_id",
                node_id="test_node_id",
                framework="react",
                style_framework="tailwind"
            )
            
            # Проверяем вызов метода с правильными параметрами
            mock_generate.assert_called_once_with(
                file_id="test_file_id",
                node_id="test_node_id",
                framework="react",
                style_framework="tailwind"
            )
            
            # Проверяем результат
            assert "code" in result
            assert "language" in result
            assert result["language"] == "jsx"
            assert "<div>Full E2E Test Component</div>" in result["code"]
    
    @pytest.mark.asyncio
    async def test_full_prompt_template_flow(self, setup_mcp_server):
        """Полный E2E тест для рабочего процесса с использованием шаблона промпта"""
        server, mock_figma, mock_adapter = setup_mcp_server
        
        # Создаем временный шаблон для теста
        with patch('server.PromptManager') as mock_pm:
            # Мокаем менеджер промптов
            prompt_manager_instance = MagicMock()
            prompt_manager_instance.render_template.return_value = "Test prompt template with {{variable}}"
            mock_pm.return_value = prompt_manager_instance
            
            # Настройка мока для LLM ответа
            mock_adapter.send_prompt.return_value = "E2E test response from template"
            
            # Вызываем метод с использованием шаблона
            result = await server.use_template(
                template_name="test_template.j2",
                variables={"variable": "test_value"}
            )
            
            # Проверяем, что шаблон был отрендерен
            prompt_manager_instance.render_template.assert_called_once_with(
                "test_template.j2", 
                {"variable": "test_value"}
            )
            
            # Проверяем, что промпт был отправлен в LLM
            mock_adapter.send_prompt.assert_called_once()
            
            # Проверяем результат
            assert result == "E2E test response from template"


if __name__ == '__main__':
    pytest.main() 