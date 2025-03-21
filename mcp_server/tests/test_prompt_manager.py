import unittest
import os
import tempfile
import shutil
import json
from pathlib import Path
import sys
from unittest.mock import patch, MagicMock

# Добавляем родительский каталог в sys.path для импорта модулей
sys.path.append(str(Path(__file__).parent.parent))

from tools.prompt_manager import PromptManager


class TestPromptManager(unittest.TestCase):
    def setUp(self):
        """Настройка для тестов - создаем временную директорию для шаблонов"""
        self.temp_dir = tempfile.mkdtemp()
        self.prompt_manager = PromptManager(templates_dir=self.temp_dir)
        
        # Создаем тестовый шаблон
        self.test_template_name = "test_template.j2"
        self.test_template_content = """
{# 
{
  "description": "Test template for unit tests",
  "parameters": {
    "name": "string",
    "values": "array"
  },
  "category": "test"
}
#}

Hello, {{ name }}!
{% for item in values %}
- {{ item }}
{% endfor %}
"""
        with open(os.path.join(self.temp_dir, self.test_template_name), 'w', encoding='utf-8') as f:
            f.write(self.test_template_content)
        
        # Обновляем список шаблонов
        self.prompt_manager.templates = self.prompt_manager._load_templates()

    def tearDown(self):
        """Очистка после тестов - удаляем временную директорию"""
        shutil.rmtree(self.temp_dir)

    def test_load_templates(self):
        """Проверка загрузки шаблонов"""
        templates = self.prompt_manager._load_templates()
        self.assertIn(self.test_template_name, templates)
        self.assertEqual(templates[self.test_template_name]["description"], "Test template for unit tests")
        self.assertEqual(templates[self.test_template_name]["category"], "test")
        self.assertIn("name", templates[self.test_template_name]["parameters"])
        self.assertIn("values", templates[self.test_template_name]["parameters"])

    def test_get_template(self):
        """Проверка получения информации о шаблоне"""
        template = self.prompt_manager.get_template(self.test_template_name)
        self.assertIsNotNone(template)
        self.assertEqual(template["name"], self.test_template_name)
        self.assertEqual(template["description"], "Test template for unit tests")

    def test_get_nonexistent_template(self):
        """Проверка получения информации о несуществующем шаблоне"""
        template = self.prompt_manager.get_template("nonexistent.j2")
        self.assertIsNone(template)

    def test_list_templates(self):
        """Проверка получения списка шаблонов"""
        templates = self.prompt_manager.list_templates()
        self.assertEqual(len(templates), 1)
        self.assertEqual(templates[0]["name"], self.test_template_name)

    def test_list_templates_by_category(self):
        """Проверка получения списка шаблонов по категории"""
        templates = self.prompt_manager.list_templates(category="test")
        self.assertEqual(len(templates), 1)
        self.assertEqual(templates[0]["name"], self.test_template_name)
        
        # Проверка несуществующей категории
        templates = self.prompt_manager.list_templates(category="nonexistent")
        self.assertEqual(len(templates), 0)

    def test_render_template(self):
        """Проверка рендеринга шаблона"""
        context = {
            "name": "World",
            "values": ["one", "two", "three"]
        }
        rendered = self.prompt_manager.render_template(self.test_template_name, context)
        self.assertIn("Hello, World!", rendered)
        self.assertIn("- one", rendered)
        self.assertIn("- two", rendered)
        self.assertIn("- three", rendered)

    def test_render_template_error(self):
        """Проверка обработки ошибок при рендеринге шаблона"""
        # Тест с несуществующим шаблоном
        with self.assertRaises(ValueError):
            self.prompt_manager.render_template("nonexistent.j2", {})
        
        # Тест с ошибкой в данных контекста
        with self.assertRaises(ValueError):
            self.prompt_manager.render_template(self.test_template_name, {"name": "Test"})  # Отсутствует values

    def test_create_template(self):
        """Проверка создания нового шаблона"""
        template_name = "new_template.j2"
        content = "This is a {{ adjective }} template."
        metadata = {
            "description": "A new test template",
            "parameters": {"adjective": "string"},
            "category": "test"
        }
        
        result = self.prompt_manager.create_template(template_name, content, metadata)
        self.assertTrue(result)
        
        # Проверка, что шаблон создан
        template_path = os.path.join(self.temp_dir, template_name)
        self.assertTrue(os.path.exists(template_path))
        
        # Проверка, что метаданные добавлены
        with open(template_path, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn("{#", content)
        self.assertIn("A new test template", content)
        
        # Проверка, что шаблон добавлен в список
        template = self.prompt_manager.get_template(template_name)
        self.assertIsNotNone(template)
        self.assertEqual(template["description"], "A new test template")

    def test_delete_template(self):
        """Проверка удаления шаблона"""
        # Удаляем существующий шаблон
        result = self.prompt_manager.delete_template(self.test_template_name)
        self.assertTrue(result)
        
        # Проверка, что файл удален
        template_path = os.path.join(self.temp_dir, self.test_template_name)
        self.assertFalse(os.path.exists(template_path))
        
        # Проверка, что шаблон удален из списка
        template = self.prompt_manager.get_template(self.test_template_name)
        self.assertIsNone(template)
        
        # Попытка удалить несуществующий шаблон
        result = self.prompt_manager.delete_template("nonexistent.j2")
        self.assertFalse(result)

    @patch('tools.prompt_manager.logger')
    def test_error_handling(self, mock_logger):
        """Проверка обработки ошибок"""
        # Тест с ошибкой загрузки шаблонов
        with patch('pathlib.Path.glob', side_effect=Exception("Test error")):
            templates = self.prompt_manager._load_templates()
            self.assertEqual(templates, {})
            mock_logger.error.assert_called_once()
        
        # Сбрасываем мок
        mock_logger.reset_mock()
        
        # Тест с ошибкой извлечения метаданных
        with patch('builtins.open', side_effect=Exception("Test error")):
            metadata = self.prompt_manager._extract_metadata(Path("nonexistent.j2"))
            self.assertEqual(metadata["description"], "")
            mock_logger.error.assert_called_once()


if __name__ == '__main__':
    unittest.main() 