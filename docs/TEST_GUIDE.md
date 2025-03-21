# Руководство по тестированию

В данном документе описывается процесс тестирования компонентов проекта для обеспечения их правильной работы и надежности.

## Содержание

1. [Обзор стратегии тестирования](#обзор-стратегии-тестирования)
2. [Виды тестов](#виды-тестов)
3. [Организация тестов](#организация-тестов)
4. [Запуск тестов](#запуск-тестов)
5. [Написание новых тестов](#написание-новых-тестов)
   - [Модульные тесты](#модульные-тесты)
   - [Интеграционные тесты](#интеграционные-тесты)
6. [Мокирование зависимостей](#мокирование-зависимостей)
7. [Покрытие кода тестами](#покрытие-кода-тестами)
8. [Непрерывная интеграция](#непрерывная-интеграция)

## Обзор стратегии тестирования

Основная стратегия тестирования проекта включает несколько уровней:

1. **Модульные тесты (Unit Tests)** - тестирование отдельных компонентов и функций в изоляции.
2. **Интеграционные тесты (Integration Tests)** - тестирование взаимодействия между компонентами.
3. **Ручное тестирование** - тестирование сложных сценариев, требующих визуального контроля.

Для модульных и интеграционных тестов используются фреймворки `unittest` и `pytest`, а также вспомогательные библиотеки для мокирования внешних зависимостей.

## Виды тестов

### Модульные тесты (Unit Tests)

Модульные тесты проверяют работу отдельных компонентов системы в изоляции. В проекте реализованы модульные тесты для:

- LLM-адаптеров (`test_llm_adapter.py`)
- Менеджера промптов (`test_prompt_manager.py`)
- Сервиса LLM (`test_llm_service.py`)

### Интеграционные тесты (Integration Tests)

Интеграционные тесты проверяют взаимодействие между компонентами системы. Они включают:

- Тесты взаимодействия с Figma API
- Тесты взаимодействия между LLM и PromptManager
- Тесты взаимодействия между MCP-сервером и инструментами

### Ручное тестирование

Для некоторых компонентов, требующих визуального контроля или сложных взаимодействий с пользовательским интерфейсом, применяется ручное тестирование, включая:

- Тестирование Figma-плагина
- Тестирование генерации адаптивных макетов
- Тестирование пользовательских сценариев работы с MCP

## Организация тестов

Тесты организованы в директории `mcp_server/tests/` и имеют следующую структуру:

```
mcp_server/
  └── tests/
      ├── test_llm_adapter.py       # Тесты для LLMAdapter и его реализаций
      ├── test_prompt_manager.py    # Тесты для PromptManager
      ├── test_llm_service.py       # Тесты для LLMService
      ├── test_figma_api.py         # Тесты для работы с Figma API
      ├── test_websocket.py         # Тесты для WebSocket-взаимодействия
      └── fixtures/                 # Тестовые данные и фикстуры
```

## Запуск тестов

### Запуск всех тестов

Для запуска всех тестов используйте команду:

```bash
cd mcp_server
python -m pytest
```

### Запуск определенного теста

Для запуска конкретного файла с тестами:

```bash
python -m pytest tests/test_llm_adapter.py
```

Для запуска конкретного теста:

```bash
python -m pytest tests/test_llm_adapter.py::TestOpenAIAdapter::test_send_prompt
```

### Запуск с параметрами

Запуск с подробным выводом:

```bash
python -m pytest -v
```

Запуск с генерацией отчета о покрытии:

```bash
python -m pytest --cov=tools tests/
```

## Написание новых тестов

### Модульные тесты

Пример создания модульного теста:

```python
import unittest
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from tools.some_module import SomeClass

class TestSomeClass(unittest.TestCase):
    def setUp(self):
        """Настройка теста - создание экземпляра тестируемого класса и моков"""
        self.instance = SomeClass()
        
    def tearDown(self):
        """Очистка после теста"""
        pass
        
    def test_some_method(self):
        """Тестирование какого-то метода"""
        result = self.instance.some_method("test")
        self.assertEqual(result, "expected result")
        
    def test_exception_handling(self):
        """Тестирование обработки исключений"""
        with self.assertRaises(ValueError):
            self.instance.some_method(None)
            
if __name__ == '__main__':
    unittest.main()
```

### Интеграционные тесты

Пример создания интеграционного теста с использованием `pytest`:

```python
import pytest
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).parent.parent))

from tools.llm_factory import LLMFactory
from tools.prompt_manager import PromptManager

@pytest.fixture
def prompt_manager():
    """Фикстура для создания экземпляра PromptManager"""
    return PromptManager()
    
@pytest.fixture
def llm_adapter():
    """Фикстура для создания экземпляра LLMAdapter"""
    return LLMFactory.create_adapter("openai")
    
@pytest.mark.asyncio
async def test_prompt_with_llm(prompt_manager, llm_adapter):
    """Интеграционный тест взаимодействия PromptManager и LLMAdapter"""
    # Создание промпта с использованием менеджера
    prompt = prompt_manager.render_template("test_template.j2", {"variable": "test"})
    
    # Отправка промпта в LLM
    response = await llm_adapter.send_prompt(prompt)
    
    # Проверки
    assert response is not None
    assert isinstance(response, str)
```

## Мокирование зависимостей

Для мокирования внешних зависимостей используется библиотека `unittest.mock`:

```python
from unittest.mock import patch, MagicMock

# Мокирование функции
@patch('module.some_function', return_value="mocked_result")
def test_with_mock(mock_function):
    # Использование мока
    result = some_function()
    assert result == "mocked_result"
    mock_function.assert_called_once()
    
# Мокирование объекта
@patch('module.SomeClass')
def test_with_mock_class(MockClass):
    # Настройка мока
    mock_instance = MockClass.return_value
    mock_instance.method.return_value = "mocked_result"
    
    # Использование мока
    instance = SomeClass()
    result = instance.method()
    assert result == "mocked_result"
```

## Покрытие кода тестами

Для отслеживания покрытия кода тестами используется инструмент `pytest-cov`.

Запустите тесты с генерацией отчета о покрытии:

```bash
python -m pytest --cov=tools tests/
```

Для генерации HTML-отчета о покрытии:

```bash
python -m pytest --cov=tools --cov-report=html tests/
```

Отчет будет сохранен в директории `htmlcov/`.

## Непрерывная интеграция

Для обеспечения непрерывной интеграции и автоматического запуска тестов при изменении кода рекомендуется настроить GitHub Actions или другую CI-систему.

Пример конфигурации GitHub Actions:

```yaml
name: Python Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
        
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-cov pytest-asyncio
        
    - name: Test with pytest
      run: |
        cd mcp_server
        python -m pytest --cov=tools tests/
        
    - name: Upload coverage report
      uses: codecov/codecov-action@v1
```

## Рекомендации по написанию тестов

1. **Изоляция тестов** - каждый тест должен быть независимым от других и не иметь побочных эффектов.
2. **Описательные имена** - названия тестов должны ясно описывать, что они проверяют.
3. **AAA-паттерн** - структурируйте тесты по паттерну Arrange-Act-Assert (Подготовка-Действие-Проверка).
4. **Мокирование внешних зависимостей** - используйте моки для изоляции тестов от внешних сервисов.
5. **Проверка граничных случаев** - тестируйте не только нормальное поведение, но и обработку ошибок, пустых значений и других краевых случаев.

### Пример использования AAA-паттерна:

```python
def test_some_function():
    # Arrange - подготовка данных и состояния
    input_data = {"key": "value"}
    expected_result = "processed value"
    
    # Act - выполнение тестируемого кода
    actual_result = process_data(input_data)
    
    # Assert - проверка результатов
    assert actual_result == expected_result
``` 