# MCP-сервер для Figma интеграции с AI

Этот проект представляет собой MCP-сервер для интеграции дизайна Figma с возможностями AI, такими как OpenAI API. Сервер предоставляет инструменты для анализа дизайна, генерации кода и создания адаптивных макетов.

## Архитектура проекта

- **server.py** - Основной MCP-сервер
- **tools/** - Инструменты для работы с Figma API, LLM, WebSocket и т.д.
- **resources/prompts/** - Шаблоны промптов для различных задач
- **tests/** - Модульные и интеграционные тесты
- **logs/** - Логи работы сервера

## Установка и запуск

### Требования

- Python 3.9+
- [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens)
- [OpenAI API Key](https://platform.openai.com/account/api-keys)

### Настройка порта WebSocket

Сервер использует WebSocket для коммуникации с плагином Figma. По умолчанию порт установлен на 8766.

Вы можете изменить порт в файле `.env`:
```
WEBSOCKET_PORT=8766
```

Убедитесь, что порт в плагине Figma (файл `ui.html`) также соответствует данному значению:
```javascript
const serverUrl = 'ws://localhost:8766';
```

### Установка зависимостей

```bash
# Создание виртуального окружения (опционально)
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate

# Установка зависимостей
pip install -r requirements.txt
```

### Настройка окружения

1. Создайте файл `.env` в папке mcp_server (или используйте существующий)
2. Укажите ваши API-ключи и другие параметры:

```env
# Figma API
FIGMA_ACCESS_TOKEN=your_figma_access_token

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Портальные настройки
MCP_PORT=5000
WEBSOCKET_PORT=8766

# Конфигурация логирования
LOG_LEVEL=INFO
LOG_FILE=logs/mcp_server.log
```

### Запуск сервера

```bash
cd mcp_server
python server.py
```

После запуска сервер будет доступен:
- MCP API на порту 5000
- WebSocket на порту 8766

## Тестирование

Для проверки работоспособности сервера можно использовать встроенные тесты:

### Базовое тестирование (без внешних API)

```bash
cd mcp_server
python test_basic.py
```

Этот тест проверяет:
- Загрузку и обработку шаблонов промптов
- Работу WebSocket-сервера

### Модульные и интеграционные тесты

```bash
cd mcp_server
pytest -v tests/
```

Для запуска конкретного теста:

```bash
pytest -v tests/test_prompt_manager.py
```

## Использование

### Figma Plugin

Для взаимодействия с MCP-сервером из Figma, используйте плагин с WebSocket-коммуникацией.

### Доступные инструменты

#### Анализ дизайна

- `analyze_design` - общий анализ дизайна и рекомендации
- `analyze_layout` - анализ компоновки элементов
- `analyze_styles` - анализ стилей и цветовой схемы
- `analyze_accessibility` - анализ доступности интерфейса

#### Генерация кода

- `generate_code` - генерация кода для различных фреймворков

#### Адаптивный дизайн

- `generate_responsive_layout` - генерация адаптивных версий макета

## Лицензия

MIT 