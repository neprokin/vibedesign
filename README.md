# Vibe Design

Vibe Design - это инструмент для автоматизации работы с дизайном в Figma, который использует AI (LLM) и MCP (Model Context Protocol) для анализа и редактирования дизайна.

## Основные возможности

- 🎨 Извлечение данных из Figma (структура, дизайн-токены)
- 🤖 AI-ассистент для генерации и редактирования компонентов
- 🔄 Автоматическое обновление дизайна через Figma Plugin
- 📊 Анализ и оптимизация дизайн-систем

## Структура проекта

```
.
├── mcp_server/          # MCP сервер на Python
│   ├── server.py        # Основной MCP-сервер
│   └── tools/           # Инструменты для работы с Figma/LLM
├── figma_plugin/        # Figma плагин
│   ├── src/             # Исходный код
│   ├── ui/              # UI компоненты
│   └── styles/          # CSS стили
└── docs/               # Документация
```

## Установка и запуск

### MCP Сервер

```bash
cd mcp_server
pip install -r requirements.txt
python server.py
```

### Figma Plugin

```bash
cd figma_plugin
npm install
npm run build
```

## Использование

1. Запустите MCP сервер
2. Установите плагин в Figma
3. Подключитесь к серверу через плагин
4. Используйте AI-ассистента для работы с дизайном

## Дизайн-токены

В проекте используется система дизайн-токенов для поддержания единого стиля:

- Цвета (primary-color, secondary-color, etc.)
- Типографика (heading-font, body-font, etc.)
- Отступы (spacing-sm, spacing-md, etc.)
- Эффекты (shadow-sm, shadow-md, etc.)

## Разработка

### Требования

- Python 3.9+
- Node.js 16+
- Figma Desktop App

### Команды

```bash
# Запуск в режиме разработки
npm run dev

# Сборка проекта
npm run build

# Запуск тестов
npm test
```

## Лицензия

MIT 