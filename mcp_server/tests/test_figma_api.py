import unittest
import os
import json
from pathlib import Path
import sys
from unittest.mock import patch, MagicMock
import pytest
import asyncio
import requests

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent.parent))

from tools.figma_api import FigmaAPI


class TestFigmaAPI(unittest.TestCase):
    def setUp(self):
        """Настройка для тестов"""
        # Мокаем переменную окружения с API ключом
        self.api_key_patcher = patch.dict('os.environ', {"FIGMA_ACCESS_TOKEN": "test_api_key"})
        self.api_key_patcher.start()
        
        # Мокаем requests.get для тестирования без реальных запросов
        self.requests_patcher = patch('tools.figma_api.requests.get')
        self.mock_requests = self.requests_patcher.start()
        
        # Создаем экземпляр API для тестов
        self.figma_api = FigmaAPI()

    def tearDown(self):
        """Очистка после тестов"""
        self.api_key_patcher.stop()
        self.requests_patcher.stop()

    def test_initialization(self):
        """Проверка корректной инициализации FigmaAPI"""
        self.assertEqual(self.figma_api.access_token, "test_api_key")
        self.assertEqual(self.figma_api.api_url, "https://api.figma.com/v1")

    def test_initialization_with_token(self):
        """Проверка инициализации FigmaAPI с указанным токеном"""
        api = FigmaAPI(access_token="custom_token")
        self.assertEqual(api.access_token, "custom_token")

    def test_get_headers(self):
        """Проверка формирования заголовков для запроса"""
        headers = self.figma_api._get_headers()
        self.assertEqual(headers["X-Figma-Token"], "test_api_key")

    @patch('tools.figma_api.logger')
    def test_get_file(self, mock_logger):
        """Проверка получения данных файла Figma"""
        # Настраиваем мок для возврата ответа
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"name": "Test File", "document": {}}
        self.mock_requests.return_value = mock_response
        
        # Вызываем метод
        file_data = self.figma_api.get_file("file_id")
        
        # Проверки
        self.mock_requests.assert_called_once_with(
            "https://api.figma.com/v1/files/file_id",
            headers=self.figma_api._get_headers()
        )
        self.assertEqual(file_data["name"], "Test File")
        mock_logger.info.assert_called()

    @patch('tools.figma_api.logger')
    def test_get_file_error(self, mock_logger):
        """Проверка обработки ошибок при получении файла"""
        # Настраиваем мок для возврата ошибки
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json.return_value = {"error": "File not found"}
        self.mock_requests.return_value = mock_response
        
        # Вызываем метод и проверяем исключение
        with self.assertRaises(Exception):
            self.figma_api.get_file("invalid_id")
        
        mock_logger.error.assert_called()

    @patch('tools.figma_api.logger')
    def test_get_file_with_exception(self, mock_logger):
        """Проверка обработки исключений при запросе"""
        # Настраиваем мок для выброса исключения
        self.mock_requests.side_effect = requests.RequestException("Connection error")
        
        # Вызываем метод и проверяем исключение
        with self.assertRaises(Exception):
            self.figma_api.get_file("file_id")
        
        mock_logger.error.assert_called()

    @patch('tools.figma_api.logger')
    def test_get_node(self, mock_logger):
        """Проверка получения данных узла Figma"""
        # Настраиваем мок для возврата ответа
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"nodes": {"node_id": {"document": {}}}}
        self.mock_requests.return_value = mock_response
        
        # Вызываем метод
        node_data = self.figma_api.get_node("file_id", "node_id")
        
        # Проверки
        self.mock_requests.assert_called_once_with(
            "https://api.figma.com/v1/files/file_id/nodes?ids=node_id",
            headers=self.figma_api._get_headers()
        )
        self.assertIn("document", node_data)
        mock_logger.info.assert_called()

    @patch('tools.figma_api.logger')
    def test_get_node_error(self, mock_logger):
        """Проверка обработки ошибок при получении узла"""
        # Настраиваем мок для возврата ошибки
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.json.return_value = {"error": "Node not found"}
        self.mock_requests.return_value = mock_response
        
        # Вызываем метод и проверяем исключение
        with self.assertRaises(Exception):
            self.figma_api.get_node("file_id", "invalid_node")
        
        mock_logger.error.assert_called()

    @patch('tools.figma_api.logger')
    def test_get_node_not_in_response(self, mock_logger):
        """Проверка обработки случая, когда узел не найден в ответе"""
        # Настраиваем мок для возврата пустого ответа
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"nodes": {}}
        self.mock_requests.return_value = mock_response
        
        # Вызываем метод и проверяем исключение
        with self.assertRaises(KeyError):
            self.figma_api.get_node("file_id", "not_found_node")
        
        mock_logger.error.assert_called()

    @patch('tools.figma_api.logger')
    def test_get_image_urls(self, mock_logger):
        """Проверка получения URL изображений"""
        # Настраиваем мок для возврата ответа
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"images": {"node_id": "https://example.com/image.png"}}
        self.mock_requests.return_value = mock_response
        
        # Вызываем метод
        image_urls = self.figma_api.get_image_urls("file_id", ["node_id"])
        
        # Проверки
        self.mock_requests.assert_called_once_with(
            "https://api.figma.com/v1/files/file_id/images?ids=node_id&format=png",
            headers=self.figma_api._get_headers()
        )
        self.assertEqual(image_urls["node_id"], "https://example.com/image.png")
        mock_logger.info.assert_called()

    @patch('tools.figma_api.logger')
    def test_get_image_urls_error(self, mock_logger):
        """Проверка обработки ошибок при получении URL изображений"""
        # Настраиваем мок для возврата ошибки
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.json.return_value = {"error": "Invalid request"}
        self.mock_requests.return_value = mock_response
        
        # Вызываем метод и проверяем исключение
        with self.assertRaises(Exception):
            self.figma_api.get_image_urls("file_id", ["node_id"])
        
        mock_logger.error.assert_called()


# Интеграционные тесты с LLM и Figma API
class TestFigmaWithLLM:
    @pytest.fixture
    def figma_api(self):
        """Фикстура для создания моканного Figma API"""
        with patch.dict('os.environ', {"FIGMA_ACCESS_TOKEN": "test_api_key"}):
            with patch('tools.figma_api.requests.get') as mock_get:
                # Настраиваем мок для get_node
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {
                    "nodes": {
                        "test_node": {
                            "document": {
                                "id": "test_node",
                                "name": "TestFrame",
                                "type": "FRAME",
                                "fills": [{"type": "SOLID", "color": {"r": 1, "g": 0, "b": 0}}]
                            }
                        }
                    }
                }
                mock_get.return_value = mock_response
                
                api = FigmaAPI()
                return api
    
    @pytest.fixture
    def llm_service(self):
        """Фикстура для создания моканного LLM сервиса"""
        with patch('tools.llm.LLMService') as MockLLMService:
            service = MockLLMService.return_value
            
            # Мок для analyze_design
            async def mock_analyze_design(figma_data):
                return {
                    "analysis": "Test analysis",
                    "suggestions": ["Use design tokens", "Improve color contrast"]
                }
            
            service.analyze_design = mock_analyze_design
            return service
    
    @pytest.mark.asyncio
    async def test_analyze_figma_node(self, figma_api, llm_service):
        """Тестирование интеграции Figma API и LLM для анализа узла"""
        # Получаем данные узла из Figma API
        node_data = figma_api.get_node("test_file", "test_node")
        
        # Анализируем данные с помощью LLM
        analysis = await llm_service.analyze_design(node_data)
        
        # Проверки
        assert "analysis" in analysis
        assert "suggestions" in analysis
        assert len(analysis["suggestions"]) == 2
        assert "Use design tokens" in analysis["suggestions"]


if __name__ == '__main__':
    unittest.main() 