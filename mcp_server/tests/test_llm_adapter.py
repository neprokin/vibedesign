import unittest
import asyncio
from unittest.mock import patch, MagicMock
import pytest
import sys
import os
from pathlib import Path

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent.parent))

from tools.llm_adapter import LLMAdapter
from tools.openai_adapter import OpenAIAdapter
from tools.llm_factory import LLMFactory


# Тесты для абстрактного класса LLMAdapter
class TestLLMAdapter(unittest.TestCase):
    def test_abstract_class_instantiation(self):
        """Проверка, что абстрактный класс нельзя инстанцировать напрямую"""
        with self.assertRaises(TypeError):
            adapter = LLMAdapter()


# Тесты для OpenAIAdapter с использованием моков
class TestOpenAIAdapter(unittest.TestCase):
    def setUp(self):
        """Настройка тестов"""
        # Мокаем переменную окружения с API ключом
        self.api_key_patcher = patch.dict('os.environ', {"OPENAI_API_KEY": "test_api_key"})
        self.api_key_patcher.start()
        
        # Мокаем модуль openai
        self.openai_patcher = patch('tools.openai_adapter.openai')
        self.mock_openai = self.openai_patcher.start()
        
        # Создаем экземпляр адаптера для тестов
        self.adapter = OpenAIAdapter(api_key="test_api_key", default_model="gpt-4")

    def tearDown(self):
        """Очистка после тестов"""
        self.api_key_patcher.stop()
        self.openai_patcher.stop()

    def test_initialization(self):
        """Проверка корректной инициализации OpenAIAdapter"""
        self.assertEqual(self.adapter.api_key, "test_api_key")
        self.assertEqual(self.adapter.default_model, "gpt-4")
        self.mock_openai.api_key = "test_api_key"

    def test_initialization_from_env(self):
        """Проверка инициализации OpenAIAdapter из переменных окружения"""
        adapter = OpenAIAdapter()
        self.assertEqual(adapter.api_key, "test_api_key")  # Значение из моканного os.environ
        self.assertEqual(adapter.default_model, "gpt-4")  # Значение по умолчанию

    @patch('tools.openai_adapter.jsonschema')
    @pytest.mark.asyncio
    async def test_generate_json(self, mock_jsonschema):
        """Проверка генерации JSON с использованием OpenAI API"""
        # Мокаем ответ от OpenAI API
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"test": "value"}'
        self.mock_openai.ChatCompletion.acreate.return_value = mock_response
        
        # Мокаем метод send_prompt для упрощения тестирования
        with patch.object(self.adapter, 'send_prompt', return_value='{"test": "value"}'):
            schema = {"type": "object", "properties": {"test": {"type": "string"}}}
            result = await self.adapter.generate_json("Test prompt", schema)
            
            # Проверяем, что результат корректен
            self.assertEqual(result, {"test": "value"})
            
            # Проверяем, что была выполнена валидация JSON
            mock_jsonschema.validate.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_prompt(self):
        """Проверка отправки промпта в OpenAI API"""
        # Мокаем ответ от OpenAI API
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Test response"
        self.mock_openai.ChatCompletion.acreate.return_value = mock_response
        
        # Вызываем метод send_prompt
        response = await self.adapter.send_prompt(
            prompt="Test prompt",
            system_message="System message",
            temperature=0.7,
            max_tokens=100
        )
        
        # Проверяем, что был выполнен запрос к API с правильными параметрами
        self.mock_openai.ChatCompletion.acreate.assert_called_once_with(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "System message"},
                {"role": "user", "content": "Test prompt"}
            ],
            temperature=0.7,
            max_tokens=100
        )
        
        # Проверяем, что результат корректен
        self.assertEqual(response, "Test response")

    @pytest.mark.asyncio
    async def test_analyze_design(self):
        """Проверка анализа дизайна"""
        # Мокаем метод generate_json для упрощения тестирования
        expected_result = {
            "analysis": "Test analysis",
            "suggestions": ["Suggestion 1", "Suggestion 2"]
        }
        
        with patch.object(self.adapter, 'generate_json', return_value=expected_result):
            result = await self.adapter.analyze_design({"test": "design_data"}, ["Criterion 1"])
            
            # Проверяем, что результат корректен
            self.assertEqual(result, expected_result)


# Тесты для LLMFactory
class TestLLMFactory(unittest.TestCase):
    @patch.dict('os.environ', {"OPENAI_API_KEY": "test_api_key"})
    def test_create_adapter_openai(self):
        """Проверка создания адаптера OpenAI через фабрику"""
        adapter = LLMFactory.create_adapter("openai")
        self.assertIsInstance(adapter, OpenAIAdapter)
        self.assertEqual(adapter.default_model, "gpt-4")  # Значение по умолчанию

    @patch.dict('os.environ', {"OPENAI_API_KEY": "test_api_key"})
    def test_create_adapter_with_config(self):
        """Проверка создания адаптера с конфигурацией"""
        config = {"model": "gpt-3.5-turbo", "api_key": "custom_key"}
        adapter = LLMFactory.create_adapter("openai", config)
        self.assertIsInstance(adapter, OpenAIAdapter)
        self.assertEqual(adapter.default_model, "gpt-3.5-turbo")
        self.assertEqual(adapter.api_key, "custom_key")

    def test_unsupported_adapter(self):
        """Проверка обработки неподдерживаемого типа адаптера"""
        with self.assertRaises(ValueError):
            LLMFactory.create_adapter("unsupported_adapter")

    def test_get_available_adapters(self):
        """Проверка получения списка доступных адаптеров"""
        adapters = LLMFactory.get_available_adapters()
        self.assertIsInstance(adapters, dict)
        self.assertIn("openai", adapters)
        self.assertTrue(len(adapters["openai"]) > 0)


if __name__ == '__main__':
    unittest.main() 