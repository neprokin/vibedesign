# Документация по AI-инструментам

В данном документе описываются инструменты искусственного интеллекта, интегрированные в проект для автоматизации генерации кода и создания адаптивных макетов. Эти инструменты базируются на взаимодействии между MCP-сервером, Figma-плагином и LLM (Language Learning Models).

## Содержание

1. [Общая архитектура](#общая-архитектура)
2. [AI-адаптеры](#ai-адаптеры)
   - [LLMAdapter](#llmadapter)
   - [OpenAIAdapter](#openai-adapter)
   - [LLMFactory](#llmfactory)
3. [Менеджер промптов](#менеджер-промптов)
4. [Инструменты генерации кода](#инструменты-генерации-кода)
   - [Генерация компонентов React/NextJS](#генерация-компонентов-reactnextjs)
   - [Генерация стилей](#генерация-стилей)
5. [Инструменты создания адаптивных макетов](#инструменты-создания-адаптивных-макетов)
   - [Анализ макета](#анализ-макета)
   - [Генерация адаптивной версии](#генерация-адаптивной-версии)
6. [Инструменты анализа](#инструменты-анализа)
   - [Анализ дизайн-системы](#анализ-дизайн-системы)
   - [Анализ доступности (Accessibility)](#анализ-доступности)
7. [Расширение системы](#расширение-системы)
   - [Добавление новых адаптеров](#добавление-новых-адаптеров)
   - [Создание новых шаблонов промптов](#создание-новых-шаблонов-промптов)

## Общая архитектура

AI-инструменты в проекте организованы по принципу многоуровневой архитектуры:

1. **Уровень адаптеров** (директория `mcp_server/tools/`):
   - Содержит адаптеры для различных LLM-сервисов (OpenAI, потенциально другие).
   - Предоставляет унифицированный интерфейс для работы с различными моделями.

2. **Уровень управления контекстом** (директория `mcp_server/resources/prompts/`):
   - Содержит шаблоны промптов для различных задач.
   - Использует менеджер промптов для загрузки и рендеринга шаблонов.

3. **Уровень инструментов** (директория `mcp_server/tools/`):
   - Реализует конкретные функции для анализа, генерации кода и макетов.
   - Интегрируется с MCP-сервером.

4. **Уровень интеграции с Figma** (директория `figma_plugin/`):
   - Плагин для Figma, обрабатывающий команды и визуализирующий результаты.

## AI-адаптеры

### LLMAdapter

Абстрактный базовый класс для всех адаптеров LLM. Определяет общий интерфейс для взаимодействия с LLM-сервисами.

```python
class LLMAdapter:
    """Абстрактный класс для работы с различными LLM"""
    
    async def send_prompt(self, prompt, system_message="", temperature=0.7, max_tokens=None):
        """Отправка промпта в модель и получение ответа"""
        raise NotImplementedError
        
    async def generate_json(self, prompt, schema):
        """Генерация структурированного JSON-ответа"""
        raise NotImplementedError
        
    async def analyze_design(self, design_data, criteria=None):
        """Анализ данных дизайна"""
        raise NotImplementedError
```

### OpenAI Adapter

Реализация LLM-адаптера для работы с OpenAI API (GPT-3.5/GPT-4).

```python
from .llm_adapter import LLMAdapter

class OpenAIAdapter(LLMAdapter):
    """Адаптер для работы с OpenAI API"""
    
    def __init__(self, api_key=None, default_model="gpt-4"):
        """Инициализация адаптера"""
        # ...код инициализации...
        
    async def send_prompt(self, prompt, system_message="", temperature=0.7, max_tokens=None):
        """Отправка промпта в OpenAI и получение ответа"""
        # ...реализация метода...
        
    async def generate_json(self, prompt, schema):
        """Генерация структурированного JSON-ответа с валидацией схемы"""
        # ...реализация метода...
        
    async def analyze_design(self, design_data, criteria=None):
        """Анализ данных дизайна Figma"""
        # ...реализация метода...
```

### LLMFactory

Фабрика для создания экземпляров адаптеров LLM разных типов.

```python
class LLMFactory:
    """Фабрика для создания экземпляров LLM-адаптеров"""
    
    @staticmethod
    def create_adapter(adapter_type, config=None):
        """Создание адаптера по типу"""
        # ...реализация метода...
        
    @staticmethod
    def get_available_adapters():
        """Получение списка доступных адаптеров"""
        # ...реализация метода...
```

## Менеджер промптов

`PromptManager` - класс для управления шаблонами промптов. Использует Jinja2 для рендеринга шаблонов с динамическими данными.

```python
class PromptManager:
    """Менеджер для работы с шаблонами промптов"""
    
    def __init__(self, templates_dir=None):
        """Инициализация менеджера промптов"""
        # ...код инициализации...
        
    def render_template(self, template_name, context):
        """Рендерит шаблон с заданным контекстом"""
        # ...реализация метода...
        
    def list_templates(self, category=None):
        """Возвращает список доступных шаблонов"""
        # ...реализация метода...
```

### Структура шаблона промпта

Шаблоны промптов хранятся в формате Jinja2 (расширение `.j2`) и могут содержать метаданные в формате YAML или JSON:

```jinja
{# 
{
  "description": "Шаблон для генерации React-компонента",
  "parameters": {
    "component_name": "string",
    "props": "array"
  },
  "category": "code_generation"
}
#}

Создай React-компонент с названием {{ component_name }} со следующими пропсами:
{% for prop in props %}
- {{ prop.name }} (тип: {{ prop.type }}): {{ prop.description }}
{% endfor %}

Используй TypeScript и функциональный стиль.
```

## Инструменты генерации кода

### Генерация компонентов React/NextJS

Инструменты для генерации React и NextJS компонентов на основе дизайна из Figma.

#### Пример использования:

```python
async def generate_react_component(mcp, figma_node_id, component_name, description=None):
    """Генерация React-компонента на основе узла Figma"""
    # 1. Получение данных узла из Figma API
    figma_node = await get_figma_node(figma_node_id)
    
    # 2. Анализ структуры и стилей
    styles = extract_styles(figma_node)
    
    # 3. Создание контекста для промпта
    context = {
        "component_name": component_name,
        "description": description or figma_node.get("name", ""),
        "styles": styles,
        "structure": extract_structure(figma_node)
    }
    
    # 4. Рендеринг промпта и отправка в LLM
    prompt_manager = PromptManager()
    prompt = prompt_manager.render_template("react_component.j2", context)
    
    llm = LLMFactory.create_adapter("openai")
    code = await llm.send_prompt(prompt)
    
    return code
```

### Генерация стилей

Инструменты для извлечения и генерации стилей (CSS, Tailwind, Styled Components) на основе дизайна из Figma.

#### Пример использования:

```python
async def generate_tailwind_styles(mcp, figma_node_id):
    """Генерация Tailwind-классов на основе узла Figma"""
    # 1. Получение данных узла из Figma API
    figma_node = await get_figma_node(figma_node_id)
    
    # 2. Анализ стилей
    styles = extract_styles(figma_node)
    
    # 3. Создание контекста для промпта
    context = {
        "node_name": figma_node.get("name", ""),
        "styles": styles
    }
    
    # 4. Рендеринг промпта и отправка в LLM
    prompt_manager = PromptManager()
    prompt = prompt_manager.render_template("tailwind_styles.j2", context)
    
    llm = LLMFactory.create_adapter("openai")
    tailwind_classes = await llm.send_prompt(prompt)
    
    return tailwind_classes
```

## Инструменты создания адаптивных макетов

### Анализ макета

Анализ макета дизайна для выявления потенциальных проблем с адаптивностью и рекомендаций по улучшению.

#### Пример использования:

```python
async def analyze_layout(mcp, figma_node_id, viewport_sizes=None):
    """Анализ макета на адаптивность"""
    # 1. Получение данных узла из Figma API
    figma_node = await get_figma_node(figma_node_id)
    
    # 2. Определение размеров вьюпорта для анализа
    if viewport_sizes is None:
        viewport_sizes = ["desktop", "tablet", "mobile"]
    
    # 3. Создание контекста для промпта
    context = {
        "node_name": figma_node.get("name", ""),
        "structure": extract_structure(figma_node),
        "viewport_sizes": viewport_sizes
    }
    
    # 4. Рендеринг промпта и отправка в LLM
    prompt_manager = PromptManager()
    prompt = prompt_manager.render_template("analyze_layout.j2", context)
    
    llm = LLMFactory.create_adapter("openai")
    analysis = await llm.generate_json(prompt, schema={
        "type": "object",
        "properties": {
            "issues": {"type": "array"},
            "recommendations": {"type": "array"}
        }
    })
    
    return analysis
```

### Генерация адаптивной версии

Инструменты для генерации адаптивных версий макета для различных размеров экрана.

#### Пример использования:

```python
async def generate_responsive_layout(mcp, figma_node_id, target_viewport):
    """Генерация адаптивной версии макета"""
    # 1. Получение данных узла из Figma API
    figma_node = await get_figma_node(figma_node_id)
    
    # 2. Создание контекста для промпта
    context = {
        "node_name": figma_node.get("name", ""),
        "structure": extract_structure(figma_node),
        "target_viewport": target_viewport
    }
    
    # 3. Рендеринг промпта и отправка в LLM
    prompt_manager = PromptManager()
    prompt = prompt_manager.render_template("responsive_layout.j2", context)
    
    llm = LLMFactory.create_adapter("openai")
    responsive_layout = await llm.generate_json(prompt, schema={
        "type": "object",
        "properties": {
            "layout": {"type": "object"},
            "modifications": {"type": "array"}
        }
    })
    
    # 4. Создание адаптивной версии через Figma-плагин
    return responsive_layout
```

## Инструменты анализа

### Анализ дизайн-системы

Инструменты для анализа текущей дизайн-системы и предложения улучшений.

#### Пример использования:

```python
async def analyze_design_system(mcp, figma_file_id):
    """Анализ дизайн-системы проекта Figma"""
    # 1. Получение данных о дизайн-системе из Figma API
    design_system = await get_design_system(figma_file_id)
    
    # 2. Создание контекста для промпта
    context = {
        "colors": design_system.get("colors", []),
        "typography": design_system.get("typography", []),
        "components": design_system.get("components", [])
    }
    
    # 3. Рендеринг промпта и отправка в LLM
    prompt_manager = PromptManager()
    prompt = prompt_manager.render_template("analyze_design_system.j2", context)
    
    llm = LLMFactory.create_adapter("openai")
    analysis = await llm.generate_json(prompt, schema={
        "type": "object",
        "properties": {
            "consistency": {"type": "object"},
            "gaps": {"type": "array"},
            "recommendations": {"type": "array"}
        }
    })
    
    return analysis
```

### Анализ доступности (Accessibility)

Инструменты для анализа доступности дизайна и предложения улучшений.

#### Пример использования:

```python
async def analyze_accessibility(mcp, figma_node_id):
    """Анализ доступности дизайна"""
    # 1. Получение данных узла из Figma API
    figma_node = await get_figma_node(figma_node_id)
    
    # 2. Извлечение цветов, текста и структуры
    colors = extract_colors(figma_node)
    texts = extract_texts(figma_node)
    
    # 3. Создание контекста для промпта
    context = {
        "node_name": figma_node.get("name", ""),
        "colors": colors,
        "texts": texts,
        "structure": extract_structure(figma_node)
    }
    
    # 4. Рендеринг промпта и отправка в LLM
    prompt_manager = PromptManager()
    prompt = prompt_manager.render_template("analyze_accessibility.j2", context)
    
    llm = LLMFactory.create_adapter("openai")
    accessibility_analysis = await llm.generate_json(prompt, schema={
        "type": "object",
        "properties": {
            "issues": {"type": "array"},
            "recommendations": {"type": "array"},
            "wcag_compliance": {"type": "object"}
        }
    })
    
    return accessibility_analysis
```

## Расширение системы

### Добавление новых адаптеров

Для добавления поддержки новых LLM-сервисов (например, Claude от Anthropic или местных моделей) необходимо:

1. Создать новый класс, наследующий от `LLMAdapter`.
2. Реализовать абстрактные методы.
3. Зарегистрировать адаптер в `LLMFactory`.

```python
from .llm_adapter import LLMAdapter

class AnthropicAdapter(LLMAdapter):
    """Адаптер для работы с API Anthropic Claude"""
    
    def __init__(self, api_key=None, default_model="claude-2"):
        """Инициализация адаптера"""
        # ...код инициализации...
        
    async def send_prompt(self, prompt, system_message="", temperature=0.7, max_tokens=None):
        """Отправка промпта в Anthropic API и получение ответа"""
        # ...реализация метода...
```

Затем добавить адаптер в фабрику:

```python
@staticmethod
def create_adapter(adapter_type, config=None):
    """Создание адаптера по типу"""
    if adapter_type == "openai":
        return OpenAIAdapter(**(config or {}))
    elif adapter_type == "anthropic":  # Новый адаптер
        return AnthropicAdapter(**(config or {}))
    else:
        raise ValueError(f"Unsupported adapter type: {adapter_type}")
```

### Создание новых шаблонов промптов

Для создания новых шаблонов промптов необходимо:

1. Создать новый файл с расширением `.j2` в директории `mcp_server/resources/prompts/`.
2. Добавить метаданные в начало файла в формате YAML или JSON.
3. Написать шаблон с использованием синтаксиса Jinja2.

Пример нового шаблона:

```jinja
{# 
{
  "description": "Шаблон для генерации документации компонента",
  "parameters": {
    "component_name": "string",
    "component_code": "string"
  },
  "category": "documentation"
}
#}

# Документация компонента {{ component_name }}

## Описание
Проанализируй код компонента и напиши его описание.

## Входные данные (Props)
Перечисли все пропсы, которые принимает компонент, их типы и назначение.

## Код компонента
```tsx
{{ component_code }}
```
```

Использование нового шаблона:

```python
prompt_manager = PromptManager()
prompt = prompt_manager.render_template("documentation.j2", {
    "component_name": "Button",
    "component_code": "..."
})
``` 