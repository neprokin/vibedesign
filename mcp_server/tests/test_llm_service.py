import unittest
import sys
import os
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent.parent))

from tools.llm import LLMService


class TestLLMService(unittest.TestCase):
    def setUp(self):
        """Настройка для тестов"""
        # Мокаем переменную окружения с API ключом
        self.api_key_patcher = patch.dict('os.environ', {"OPENAI_API_KEY": "test_api_key"})
        self.api_key_patcher.start()
        
        # Мокаем openai
        self.openai_patcher = patch('tools.llm.openai')
        self.mock_openai = self.openai_patcher.start()
        
        self.llm_service = LLMService()

    def tearDown(self):
        """Очистка после тестов"""
        self.api_key_patcher.stop()
        self.openai_patcher.stop()

    def test_initialization(self):
        """Проверка корректной инициализации LLMService"""
        self.assertEqual(self.llm_service.api_key, "test_api_key")
        self.assertEqual(self.mock_openai.api_key, "test_api_key")

    @pytest.mark.asyncio
    async def test_generate_component(self):
        """Проверка генерации компонента"""
        # Мокаем ответ от OpenAI API
        mock_response = MagicMock()
        mock_response.choices[0].message.content = """
        [
            {
                "name": "Button",
                "type": "primary",
                "styles": {
                    "backgroundColor": "#3498db",
                    "color": "#ffffff",
                    "borderRadius": "4px"
                }
            },
            {
                "name": "Button",
                "type": "secondary",
                "styles": {
                    "backgroundColor": "#ffffff",
                    "color": "#3498db",
                    "borderRadius": "4px",
                    "border": "1px solid #3498db"
                }
            }
        ]
        """
        self.mock_openai.ChatCompletion.acreate.return_value = mock_response
        
        # Тестовые данные
        description = "Кнопка для формы входа"
        context = {"colors": {"primary": "#3498db"}}
        
        # Вызов метода
        result = await self.llm_service.generate_component(description, context)
        
        # Проверки
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "Button")
        self.assertEqual(result[0]["type"], "primary")
        self.assertEqual(result[1]["type"], "secondary")
        self.assertEqual(result[0]["styles"]["backgroundColor"], "#3498db")

    @pytest.mark.asyncio
    async def test_generate_component_error(self):
        """Проверка обработки ошибок при генерации компонента"""
        # Мокаем ошибку API
        self.mock_openai.ChatCompletion.acreate.side_effect = Exception("API Error")
        
        # Тестовые данные
        description = "Кнопка для формы входа"
        context = {"colors": {"primary": "#3498db"}}
        
        # Вызов метода и проверка обработки ошибки
        result = await self.llm_service.generate_component(description, context)
        self.assertEqual(result, [])

    @pytest.mark.asyncio
    async def test_analyze_design(self):
        """Проверка анализа дизайна"""
        # Мокаем ответ от OpenAI API
        mock_response = MagicMock()
        mock_response.choices[0].message.content = """
        Анализ дизайна:
        
        * Цветовая схема согласована
        * Отсутствуют некоторые дизайн-токены
        
        Предложения:
        1. Добавить токены для отступов
        2. Унифицировать радиусы скругления
        """
        self.mock_openai.ChatCompletion.acreate.return_value = mock_response
        
        # Тестовые данные
        figma_data = {"id": "123", "name": "Frame", "children": []}
        
        # Вызов метода
        result = await self.llm_service.analyze_design(figma_data)
        
        # Проверки
        self.assertIn("analysis", result)
        self.assertIn("suggestions", result)
        self.assertEqual(len(result["suggestions"]), 4)  # 2 из "Анализ дизайна" + 2 из "Предложения"
        self.assertIn("Добавить токены для отступов", result["suggestions"])
        self.assertIn("Унифицировать радиусы скругления", result["suggestions"])

    @pytest.mark.asyncio
    async def test_analyze_design_error(self):
        """Проверка обработки ошибок при анализе дизайна"""
        # Мокаем ошибку API
        self.mock_openai.ChatCompletion.acreate.side_effect = Exception("API Error")
        
        # Тестовые данные
        figma_data = {"id": "123", "name": "Frame", "children": []}
        
        # Вызов метода и проверка обработки ошибки
        result = await self.llm_service.analyze_design(figma_data)
        self.assertEqual(result["analysis"], "")
        self.assertEqual(result["suggestions"], [])

    def test_parse_response_json(self):
        """Проверка парсинга ответа в формате JSON"""
        response = """
        Вот варианты компонентов:
        
        [
            {
                "name": "Card",
                "type": "elevated"
            },
            {
                "name": "Card",
                "type": "flat"
            }
        ]
        """
        
        result = self.llm_service._parse_response(response)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "Card")
        self.assertEqual(result[1]["type"], "flat")

    def test_parse_response_structured(self):
        """Проверка парсинга структурированного ответа"""
        response = """
        Вариант 1:
        name: Card
        type: elevated
        
        Вариант 2:
        name: Card
        type: flat
        """
        
        result = self.llm_service._parse_response(response)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "Card")
        self.assertEqual(result[1]["type"], "flat")

    def test_parse_response_error(self):
        """Проверка обработки ошибок при парсинге ответа"""
        # Неверный формат JSON
        response = """
        [
            {"name": "Card",
        """
        
        result = self.llm_service._parse_response(response)
        self.assertEqual(result, [])

    def test_extract_suggestions(self):
        """Проверка извлечения предложений из анализа"""
        analysis = """
        Анализ дизайна:
        
        • Первое предложение
        - Второе предложение
        * Третье предложение
        1. Четвертое предложение
        2. Пятое предложение
        
        Итог: шестое предложение
        """
        
        suggestions = self.llm_service._extract_suggestions(analysis)
        self.assertEqual(len(suggestions), 6)
        self.assertEqual(suggestions[0], "Первое предложение")
        self.assertEqual(suggestions[1], "Второе предложение")
        self.assertEqual(suggestions[5], "шестое предложение")


if __name__ == '__main__':
    unittest.main() 