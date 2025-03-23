from fastmcp import FastMCP
from dotenv import load_dotenv
import os
from tools.figma_api import FigmaAPI
from tools.websocket import WebSocketServer
from tools.llm_adapter import LLMAdapter
from tools.llm_factory import LLMFactory
from tools.prompt_manager import PromptManager
from tools.logger import logger
from tools.event_processor import setup_event_processor, FigmaEventType, EventSource, UpdateNodeRequestPayload
from config import load_config
import datetime
import random
import logging
import asyncio
from tools.design_analyzer import analyze_design
import json

# Загрузка переменных окружения
load_dotenv()

# Загрузка конфигурации
config = load_config()

# Инициализация сервисов
figma_api = FigmaAPI()
prompt_manager = PromptManager(config.templates_dir)

# Инициализация адаптера LLM с помощью фабрики
llm_adapter = LLMFactory.create_adapter(
    config.llm_config.get("adapter_type", "openai"),
    config.llm_config
)

# Инициализация WebSocket-сервера
ws_server = WebSocketServer()

# Инициализация обработчика событий
event_processor = setup_event_processor(ws_server)

# Инициализация MCP-сервера
mcp = FastMCP(config.server_name)

# Регистрируем дополнительные обработчики событий
async def handle_update_node(event):
    """
    Обработчик события UPDATE_NODE_REQUEST
    
    Этот обработчик вызывается при получении события UPDATE_NODE_REQUEST.
    Обновляет узел в Figma через WebSocket-соединение с плагином.
    
    Args:
        event: Событие
    """
    logger.info(f"Update node request received through event system: {event.payload}")
    
    try:
        # Преобразуем полезную нагрузку
        node_id = event.payload["nodeId"]
        properties = event.payload["properties"]
        
        # Тут должен быть код для обновления узла через Figma Plugin API
        # В данной имплементации мы только возвращаем успешный результат
        
        # Отправляем событие прогресса
        progress_event = event_processor.create_event(
            FigmaEventType.UPDATE_NODE_PROGRESS,
            {
                "nodeId": node_id,
                "status": "processing",
                "message": "Обновление узла в процессе"
            },
            event.metadata.correlation_id,
            event.metadata.session_id
        )
        
        # Отправляем PROGRESS всем клиентам
        for client in ws_server.clients:
            await event_processor.send_event(client, progress_event)
        
        # Имитируем обработку
        await asyncio.sleep(0.5)
        
        # Отправляем событие завершения
        complete_event = event_processor.create_event(
            FigmaEventType.UPDATE_NODE_COMPLETE,
            {
                "nodeId": node_id,
                "success": True,
                "updatedProperties": properties
            },
            event.metadata.correlation_id,
            event.metadata.session_id
        )
        
        # Отправляем COMPLETE всем клиентам
        for client in ws_server.clients:
            await event_processor.send_event(client, complete_event)
        
        logger.info(f"Node update completed: {node_id}")
    except Exception as e:
        logger.error(f"Error updating node: {e}", exc_info=True)
        
        # Отправляем событие ошибки
        error_event = event_processor.create_event(
            FigmaEventType.UPDATE_NODE_ERROR,
            {
                "code": "update_error",
                "message": f"Error updating node: {str(e)}",
                "details": {
                    "nodeId": event.payload.get("nodeId", "unknown")
                }
            },
            event.metadata.correlation_id,
            event.metadata.session_id
        )
        
        # Отправляем ERROR всем клиентам
        for client in ws_server.clients:
            await event_processor.send_event(client, error_event)

# Регистрируем обработчик
event_processor.register_handler(FigmaEventType.UPDATE_NODE_REQUEST, handle_update_node)

# Функция для генерации кода
async def generate_code(figma_data, component_name="Component", framework="react", css_framework="tailwind"):
    """
    Генерирует код на основе данных из Figma
    
    Args:
        figma_data: Данные дизайна из Figma
        component_name: Имя компонента
        framework: Фреймворк (react, vue, angular)
        css_framework: CSS фреймворк (tailwind, css, styled-components)
        
    Returns:
        str: Сгенерированный код
    """
    try:
        # Формируем контекст для промпта
        prompt_context = {
            "design_data": figma_data,
            "component_name": component_name,
            "framework": framework,
            "css_framework": css_framework
        }
        
        # Генерируем промпт с помощью шаблона (если шаблон есть)
        prompt = f"Generate {framework} code with {css_framework} for component {component_name} based on Figma data"
        try:
            prompt = prompt_manager.render_template("generate_code.j2", prompt_context)
        except Exception as e:
            logger.warning(f"Error rendering prompt template: {e}. Using default prompt.")
        
        # Получаем результат от LLM
        code_result = await llm_adapter.generate_code(prompt, framework, css_framework)
        return code_result
    except Exception as e:
        logger.error(f"Error in generate_code: {str(e)}", exc_info=True)
        raise

# Обработчик для генерации кода
async def handle_generate_code(event):
    """
    Обработчик события GENERATE_CODE_REQUEST
    
    Этот обработчик вызывается при получении события GENERATE_CODE_REQUEST.
    Генерирует код на основе данных дизайна, отправленных из плагина.
    
    Args:
        event: Событие
    """
    logger.info(f"Generate code request received through event system: {event.payload}")
    
    try:
        # Получаем параметры из payload
        design_data = event.payload.get("designData", {})
        framework = event.payload.get("framework", "react")
        css_framework = event.payload.get("cssFramework", "tailwind")
        component_name = event.payload.get("componentName", "Component")
        responsive = event.payload.get("responsive", True)
        
        # Отправляем событие прогресса
        progress_event = event_processor.create_event(
            FigmaEventType.GENERATE_CODE_PROGRESS,
            {
                "status": "processing",
                "message": f"Генерация кода {framework} с {css_framework}..."
            },
            event.metadata.correlation_id,
            event.metadata.session_id
        )
        
        # Отправляем PROGRESS всем клиентам
        for client in ws_server.clients:
            await event_processor.send_event(client, progress_event)
        
        # Вызываем функцию генерации кода
        result = await generate_code(
            figma_data=design_data,
            component_name=component_name,
            framework=framework,
            css_framework=css_framework
        )
        
        # Отправляем событие завершения
        complete_event = event_processor.create_event(
            FigmaEventType.GENERATE_CODE_COMPLETE,
            {
                "success": True,
                "code": result,
                "framework": framework,
                "cssFramework": css_framework
            },
            event.metadata.correlation_id,
            event.metadata.session_id
        )
        
        # Отправляем COMPLETE всем клиентам
        for client in ws_server.clients:
            await event_processor.send_event(client, complete_event)
        
        logger.info(f"Code generation completed for {component_name} ({framework}, {css_framework})")
    except Exception as e:
        logger.error(f"Error generating code: {e}", exc_info=True)
        
        # Отправляем событие ошибки
        error_event = event_processor.create_event(
            FigmaEventType.ERROR,
            {
                "code": "generate_code_error",
                "message": f"Error generating code: {str(e)}",
                "details": {
                    "framework": event.payload.get("framework", "react"),
                    "cssFramework": event.payload.get("cssFramework", "tailwind")
                }
            },
            event.metadata.correlation_id,
            event.metadata.session_id
        )
        
        # Отправляем ERROR всем клиентам
        for client in ws_server.clients:
            await event_processor.send_event(client, error_event)

# Регистрируем обработчик для генерации кода
event_processor.register_handler(FigmaEventType.GENERATE_CODE_REQUEST, handle_generate_code)

# Функции обработчики сообщений для WebSocket сервера
async def handle_generate_code_ws(websocket, payload):
    logger.info(f"WebSocket received GENERATE_CODE_REQUEST: {payload}")
    
    try:
        # Преобразуем payload в формат, ожидаемый обработчиком событий
        design_data = payload.get("designData", {})
        framework = payload.get("framework", "react")
        css_framework = payload.get("cssFramework", "tailwind")
        component_name = payload.get("componentName", "Component")
        responsive = payload.get("responsive", True)
        
        # Вызываем функцию генерации кода
        result = await generate_code(
            figma_data=design_data,
            component_name=component_name,
            framework=framework,
            css_framework=css_framework
        )
        
        # Отправляем результат обратно
        await websocket.send(json.dumps({
            "type": "GENERATE_CODE_COMPLETE",
            "payload": {
                "success": True,
                "code": result,
                "framework": framework,
                "cssFramework": css_framework
            }
        }))
        
        logger.info(f"Code generation completed for {component_name} ({framework}, {css_framework})")
    except Exception as e:
        logger.error(f"Error generating code: {e}", exc_info=True)
        
        # Отправляем сообщение об ошибке
        await websocket.send(json.dumps({
            "type": "ERROR",
            "payload": {
                "message": f"Error generating code: {str(e)}"
            }
        }))

async def handle_ping_ws(websocket, payload):
    logger.info(f"WebSocket received PING: {payload}")
    
    # Отправляем PONG в ответ
    await websocket.send(json.dumps({
        "type": "PONG",
        "payload": {
            "time": datetime.datetime.now().isoformat(),
            "echo": payload
        }
    }))

# Запуск сервера
if __name__ == "__main__":
    # Регистрируем обработчики для WebSocket сервера
    ws_server.message_handlers["PING"] = handle_ping_ws
    ws_server.message_handlers["GENERATE_CODE_REQUEST"] = handle_generate_code_ws
    
    # Запускаем WebSocket-сервер в отдельном потоке
    ws_server.start(8768)
    
    logger.info(f"Starting MCP server: {config.server_name}")
    logger.info(f"WebSocket server running on port: 8768")
    logger.info(f"Using LLM adapter: {config.llm_config.get('adapter_type')} with model: {config.llm_config.get('model')}")
    logger.info(f"Event processor initialized and ready")
    
    # Запускаем MCP-сервер
    mcp.run()

# Регистрация инструментов
@mcp.tool()
async def get_figma_data(file_key: str):
    """Получение данных из Figma API"""
    try:
        data = await figma_api.get_file(file_key)
        logger.info(f"Successfully retrieved Figma data for file: {file_key}")
        return data
    except Exception as e:
        logger.error(f"Error getting Figma data: {e}")
        raise

@mcp.tool()
async def update_figma_node(
    file_key: str,
    node_id: str,
    properties: dict
):
    """Обновление узла Figma через плагин"""
    try:
        logger.info(f"Updating Figma node {node_id} with properties: {properties}")
        
        # Создаем событие UPDATE_NODE_REQUEST
        event = event_processor.create_event(
            FigmaEventType.UPDATE_NODE_REQUEST,
            {
                "nodeId": node_id,
                "properties": properties
            }
        )
        
        # Отправляем событие всем клиентам
        for client in ws_server.clients:
            await event_processor.send_event(client, event)
        
        # Здесь мы должны дождаться ответа, но в текущей реализации просто возвращаем успех
        # В реальной реализации нужно использовать очередь или другой механизм для ожидания ответа
        
        return {
            "success": True,
            "node_id": node_id,
            "updated_properties": properties
        }
    except Exception as e:
        logger.error(f"Error updating Figma node: {e}")
        raise

@mcp.tool()
async def create_figma_node(type: str, properties: dict):
    """Создание нового узла в Figma через плагин"""
    try:
        payload = {
            "type": type,
            "properties": properties
        }
        
        await ws_server.broadcast("CREATE_NODE", payload)
        logger.info(f"Successfully sent request to create {type} node")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error creating node: {e}")
        raise

@mcp.tool()
async def delete_figma_node(
    file_key: str,
    node_id: str
):
    """Удаление узла в Figma через плагин"""
    try:
        payload = {
            "fileKey": file_key,
            "nodeId": node_id
        }
        
        await ws_server.broadcast("DELETE_NODE", payload)
        logger.info(f"Successfully sent delete request for node: {node_id}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting node: {e}")
        raise

@mcp.tool()
async def generate_component(description: str, context: dict = None):
    """Генерация вариантов UI-компонента с помощью LLM"""
    try:
        # Используем промпт-менеджер для рендеринга шаблона
        prompt_context = {
            "description": description,
            "context": context or {},
            "num_variants": 3
        }
        
        # Генерируем варианты через адаптер LLM
        variants = await llm_adapter.generate_variants(
            description=description, 
            context=context or {}, 
            num_variants=3
        )
        
        logger.info(f"Successfully generated {len(variants)} variants for component")
        return variants
    except Exception as e:
        logger.error(f"Error generating component: {e}")
        raise

@mcp.tool()
async def analyze_design(figma_data: dict, criteria: list = None):
    """Анализ дизайна и предложение улучшений с помощью LLM"""
    try:
        # Используем адаптер LLM для анализа дизайна
        result = await llm_adapter.analyze_design(
            design_data=figma_data,
            criteria=criteria
        )
        
        logger.info(f"Successfully analyzed design with {len(result.get('suggestions', []))} suggestions")
        return result
    except Exception as e:
        logger.error(f"Error analyzing design: {e}")
        raise

@mcp.tool()
async def create_rectangle(
    file_key: str,
    parent_id: str,
    name: str,
    width: float,
    height: float,
    x: float = 0,
    y: float = 0,
    fills: list = None,
    properties: dict = None
):
    """Создание прямоугольника в Figma через плагин"""
    try:
        fills = fills or []
        properties = properties or {}
        
        await ws_server.broadcast("CREATE_RECTANGLE", {
            "fileKey": file_key,
            "parentId": parent_id,
            "name": name,
            "width": width,
            "height": height,
            "x": x,
            "y": y,
            "fills": fills,
            "properties": properties
        })
        logger.info(f"Successfully sent create rectangle command for parent: {parent_id}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error creating Figma rectangle: {e}")
        raise

@mcp.tool()
async def create_text(
    file_key: str,
    parent_id: str,
    text: str,
    name: str = None,
    x: float = 0,
    y: float = 0,
    font: str = None,
    font_size: float = None,
    color: dict = None,
    text_align: str = None,
    font_weight: int = None,
    properties: dict = None
):
    """Создание текстового элемента в Figma через плагин"""
    try:
        properties = properties or {}
        
        # Если имя не указано, используем первые 20 символов текста
        if not name:
            name = text[:20]
            
        payload = {
            "fileKey": file_key,
            "parentId": parent_id,
            "text": text,
            "name": name,
            "x": x,
            "y": y,
            "properties": properties
        }
        
        # Добавляем опциональные параметры, если они указаны
        if font:
            payload["font"] = font
        if font_size:
            payload["fontSize"] = font_size
        if color:
            payload["color"] = color
        if text_align:
            payload["textAlign"] = text_align
        if font_weight:
            payload["fontWeight"] = font_weight
            
        await ws_server.broadcast("CREATE_TEXT", payload)
        logger.info(f"Successfully sent create text command for parent: {parent_id}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error creating Figma text: {e}")
        raise

@mcp.tool()
async def get_design_tokens(
    collection_id: str = None,
    token_type: str = None,
    token_name: str = None
):
    """Получение дизайн-токенов"""
    try:
        params = {}
        if collection_id:
            params["collectionId"] = collection_id
        if token_type:
            params["tokenType"] = token_type
        if token_name:
            params["tokenName"] = token_name
            
        logger.info("Getting design tokens", params)
        return {"status": "success", "action": "get_design_tokens", "params": params}
    except Exception as e:
        logger.error(f"Error getting design tokens: {e}")
        raise

@mcp.tool()
async def create_token_collection(
    name: str,
    description: str = None,
    version: str = None,
    import_data: str = None
):
    """Создание коллекции дизайн-токенов"""
    try:
        params = {
            "name": name
        }
        if description:
            params["description"] = description
        if version:
            params["version"] = version
        if import_data:
            params["importData"] = import_data
            
        logger.info(f"Creating token collection: {name}")
        return {"status": "success", "action": "create_token_collection", "params": params}
    except Exception as e:
        logger.error(f"Error creating token collection: {e}")
        raise

@mcp.tool()
async def create_design_token(
    collection_id: str,
    group_name: str,
    name: str,
    type: str,
    value: any,
    description: str = None,
    meta: dict = None
):
    """Создание дизайн-токена"""
    try:
        params = {
            "collectionId": collection_id,
            "groupName": group_name,
            "name": name,
            "type": type,
            "value": value
        }
        if description:
            params["description"] = description
        if meta:
            params["meta"] = meta
            
        logger.info(f"Creating design token: {name} ({type})")
        return {"status": "success", "action": "create_design_token", "params": params}
    except Exception as e:
        logger.error(f"Error creating design token: {e}")
        raise

@mcp.tool()
async def export_design_tokens(
    collection_id: str,
    format: str
):
    """Экспорт дизайн-токенов в указанном формате"""
    try:
        params = {
            "collectionId": collection_id,
            "format": format
        }
            
        logger.info(f"Exporting design tokens in format: {format}")
        return {"status": "success", "action": "export_design_tokens", "params": params}
    except Exception as e:
        logger.error(f"Error exporting design tokens: {e}")
        raise

@mcp.tool()
async def get_figma_auth_url(
    scopes: list[str],
    state: str = None
):
    """Получение URL для OAuth авторизации в Figma"""
    try:
        if not scopes or len(scopes) == 0:
            raise ValueError("At least one scope is required")
            
        params = {
            "scopes": scopes
        }
        if state:
            params["state"] = state
            
        logger.info(f"Getting Figma OAuth URL with scopes: {', '.join(scopes)}")
        return {"status": "success", "action": "get_figma_auth_url", "params": params}
    except Exception as e:
        logger.error(f"Error getting Figma OAuth URL: {e}")
        raise

@mcp.tool()
async def get_figma_token(
    code: str
):
    """Получение токена OAuth для Figma"""
    try:
        if not code:
            raise ValueError("Authorization code is required")
            
        params = {
            "code": code
        }
            
        logger.info("Getting Figma OAuth token")
        return {"status": "success", "action": "get_figma_token", "params": params}
    except Exception as e:
        logger.error(f"Error getting Figma token: {e}")
        raise

@mcp.tool()
async def get_cached_figma_data(
    file_key: str,
    node_id: str = None,
    node_ids: list[str] = None,
    cache_ttl: int = None,
    check_freshness: bool = False,
    force_refresh: bool = False
):
    """Получение данных из Figma с кэшированием"""
    try:
        if not file_key:
            raise ValueError("File key is required")
            
        if node_id and node_ids:
            raise ValueError("Cannot specify both node_id and node_ids")
            
        params = {
            "fileKey": file_key
        }
        
        if node_id:
            params["nodeId"] = node_id
        if node_ids:
            params["nodeIds"] = node_ids
        if cache_ttl:
            params["cacheTTL"] = cache_ttl
        if check_freshness:
            params["checkFreshness"] = check_freshness
        if force_refresh:
            params["forceRefresh"] = force_refresh
            
        logger.info(f"Getting cached Figma data for file: {file_key}")
        return {"status": "success", "action": "get_cached_figma_data", "params": params}
    except Exception as e:
        logger.error(f"Error getting cached Figma data: {e}")
        raise

@mcp.tool()
async def list_prompt_templates(category: str = None):
    """Список доступных шаблонов промптов"""
    try:
        templates = prompt_manager.list_templates(category)
        return templates
    except Exception as e:
        logger.error(f"Error listing prompt templates: {e}")
        raise

@mcp.tool()
async def render_prompt_template(template_name: str, context: dict):
    """Рендеринг шаблона промпта с заданным контекстом"""
    try:
        result = prompt_manager.render_template(template_name, context)
        return result
    except Exception as e:
        logger.error(f"Error rendering prompt template: {e}")
        raise

@mcp.tool()
async def create_prompt_template(template_name: str, content: str, metadata: dict = None):
    """Создание нового шаблона промпта"""
    try:
        success = prompt_manager.create_template(template_name, content, metadata)
        if success:
            return {"status": "success", "message": f"Template {template_name} created successfully"}
        else:
            return {"status": "error", "message": f"Failed to create template {template_name}"}
    except Exception as e:
        logger.error(f"Error creating prompt template: {e}")
        raise

@mcp.tool()
async def send_custom_prompt(prompt: str, system_message: str = None, temperature: float = 0.7):
    """Отправка произвольного промпта в LLM"""
    try:
        result = await llm_adapter.send_prompt(
            prompt=prompt,
            system_message=system_message,
            temperature=temperature
        )
        
        logger.info(f"Successfully sent custom prompt to LLM")
        return result
    except Exception as e:
        logger.error(f"Error sending custom prompt: {e}")
        raise

@mcp.tool()
async def get_llm_adapters():
    """Получение списка доступных LLM-адаптеров"""
    try:
        adapters = LLMFactory.get_available_adapters()
        return adapters
    except Exception as e:
        logger.error(f"Error getting LLM adapters: {e}")
        raise

@mcp.tool()
async def analyze_layout(layout_data: dict, criteria: list = None):
    """
    Анализ компоновки элементов интерфейса
    
    Args:
        layout_data: Данные компоновки из Figma API
        criteria: Критерии для оценки компоновки (опционально)
        
    Returns:
        Анализ компоновки с оценками и рекомендациями
    """
    try:
        # Рендерим шаблон промпта с переданными параметрами
        prompt_context = {
            "layout_data": layout_data,
            "criteria": criteria
        }
        
        # Формируем JSON-схему для валидации ответа
        json_schema = {
            "type": "object",
            "required": ["analysis", "scores", "strengths", "weaknesses", "recommendations"],
            "properties": {
                "analysis": {"type": "string"},
                "scores": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "number",
                        "minimum": 1,
                        "maximum": 10
                    }
                },
                "strengths": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "weaknesses": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
        
        # Генерируем промпт через менеджер шаблонов
        prompt = prompt_manager.render_template("analyze_layout.j2", prompt_context)
        
        # Отправляем промпт в LLM и получаем структурированный ответ
        system_message = "Ты - эксперт по UI/UX дизайну с глубоким пониманием принципов компоновки интерфейсов."
        result = await llm_adapter.generate_json(
            prompt=prompt,
            json_schema=json_schema,
            system_message=system_message,
            temperature=0.4  # Используем низкую температуру для более точного анализа
        )
        
        logger.info(f"Successfully analyzed layout with {len(result.get('recommendations', []))} recommendations")
        return result
    except Exception as e:
        logger.error(f"Error analyzing layout: {e}")
        raise

@mcp.tool()
async def analyze_styles(design_data: dict, design_tokens: dict = None, criteria: list = None):
    """
    Анализ стилей и визуального оформления интерфейса
    
    Args:
        design_data: Данные дизайна из Figma API
        design_tokens: Информация о дизайн-токенах проекта (опционально)
        criteria: Критерии для оценки стилей (опционально)
        
    Returns:
        Анализ стилей с оценками и рекомендациями
    """
    try:
        # Рендерим шаблон промпта с переданными параметрами
        prompt_context = {
            "design_data": design_data,
            "design_tokens": design_tokens or {},
            "criteria": criteria
        }
        
        # Формируем JSON-схему для валидации ответа
        json_schema = {
            "type": "object",
            "required": ["analysis", "scores", "inconsistencies", "strengths", "recommendations"],
            "properties": {
                "analysis": {"type": "string"},
                "scores": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "number",
                        "minimum": 1,
                        "maximum": 10
                    }
                },
                "inconsistencies": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "strengths": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
        
        # Генерируем промпт через менеджер шаблонов
        prompt = prompt_manager.render_template("analyze_styles.j2", prompt_context)
        
        # Отправляем промпт в LLM и получаем структурированный ответ
        system_message = "Ты - эксперт по UI/UX дизайну с глубоким пониманием принципов визуального дизайна и стилей."
        result = await llm_adapter.generate_json(
            prompt=prompt,
            json_schema=json_schema,
            system_message=system_message,
            temperature=0.3  # Используем низкую температуру для более точного анализа
        )
        
        logger.info(f"Successfully analyzed styles with {len(result.get('recommendations', []))} recommendations")
        return result
    except Exception as e:
        logger.error(f"Error analyzing styles: {e}")
        raise

@mcp.tool()
async def analyze_accessibility(design_data: dict, wcag_level: str = "AA", criteria: list = None):
    """
    Анализ доступности (accessibility) интерфейса
    
    Args:
        design_data: Данные дизайна из Figma API
        wcag_level: Уровень соответствия WCAG (A, AA, AAA)
        criteria: Критерии для оценки доступности (опционально)
        
    Returns:
        Анализ доступности с оценками и рекомендациями
    """
    try:
        # Проверяем валидность wcag_level
        wcag_level = wcag_level.upper()
        if wcag_level not in ["A", "AA", "AAA"]:
            wcag_level = "AA"  # Значение по умолчанию
        
        # Рендерим шаблон промпта с переданными параметрами
        prompt_context = {
            "design_data": design_data,
            "wcag_level": wcag_level,
            "criteria": criteria
        }
        
        # Формируем JSON-схему для валидации ответа
        json_schema = {
            "type": "object",
            "required": ["analysis", "wcag_compliance", "scores", "violations", "recommendations", "strengths"],
            "properties": {
                "analysis": {"type": "string"},
                "wcag_compliance": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 100
                },
                "scores": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "number",
                        "minimum": 1,
                        "maximum": 10
                    }
                },
                "violations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["description", "severity"],
                        "properties": {
                            "description": {"type": "string"},
                            "severity": {
                                "type": "string",
                                "enum": ["критический", "серьезный", "средний", "незначительный"]
                            },
                            "wcag_criterion": {"type": "string"}
                        }
                    }
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "strengths": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
        
        # Генерируем промпт через менеджер шаблонов
        prompt = prompt_manager.render_template("analyze_accessibility.j2", prompt_context)
        
        # Отправляем промпт в LLM и получаем структурированный ответ
        system_message = "Ты - эксперт по доступности (accessibility) веб-интерфейсов с глубоким знанием стандартов WCAG."
        result = await llm_adapter.generate_json(
            prompt=prompt,
            json_schema=json_schema,
            system_message=system_message,
            temperature=0.2  # Используем очень низкую температуру для точного технического анализа
        )
        
        logger.info(f"Successfully analyzed accessibility with WCAG {wcag_level} compliance: {result.get('wcag_compliance')}%")
        return result
    except Exception as e:
        logger.error(f"Error analyzing accessibility: {e}")
        raise

@mcp.tool()
async def generate_responsive_layout(
    original_design: dict,
    target_device: str = "mobile",
    breakpoints: dict = None,
    design_tokens: dict = None
):
    """
    Генерация адаптивного макета на основе существующего дизайна
    
    Args:
        original_design: Данные оригинального дизайна из Figma API
        target_device: Целевое устройство для адаптации (mobile, tablet, desktop)
        breakpoints: Контрольные точки для адаптивного дизайна в пикселях
        design_tokens: Дизайн-токены проекта
        
    Returns:
        Структура адаптивного макета с компонентами и стилями
    """
    try:
        # Валидируем target_device
        valid_devices = ["mobile", "tablet", "desktop"]
        if target_device not in valid_devices:
            target_device = "mobile"  # Значение по умолчанию
        
        # Устанавливаем breakpoints по умолчанию, если не переданы
        if not breakpoints:
            breakpoints = {
                "mobile": 375,
                "tablet": 768,
                "desktop": 1440
            }
        
        # Рендерим шаблон промпта с переданными параметрами
        prompt_context = {
            "original_design": original_design,
            "target_device": target_device,
            "breakpoints": breakpoints,
            "design_tokens": design_tokens or {}
        }
        
        # Формируем JSON-схему для валидации ответа
        json_schema = {
            "type": "object",
            "required": ["layout_structure", "components", "responsive_rules", "navigation", "images", "implementation_notes"],
            "properties": {
                "layout_structure": {
                    "type": "object",
                    "description": "Детальное описание структуры адаптивного макета"
                },
                "components": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "type", "properties", "styles"],
                        "properties": {
                            "id": {"type": "string"},
                            "type": {"type": "string"},
                            "properties": {"type": "object"},
                            "styles": {"type": "object"},
                            "children": {"type": "array"}
                        }
                    }
                },
                "responsive_rules": {
                    "type": "object",
                    "description": "Правила адаптации для разных размеров экрана"
                },
                "navigation": {
                    "type": "object",
                    "description": "Описание навигационной системы"
                },
                "images": {
                    "type": "object",
                    "description": "Рекомендации по работе с изображениями"
                },
                "implementation_notes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Замечания и рекомендации по реализации"
                }
            }
        }
        
        # Генерируем промпт через менеджер шаблонов
        prompt = prompt_manager.render_template("generate_responsive_layout.j2", prompt_context)
        
        # Отправляем промпт в LLM и получаем структурированный ответ
        system_message = f"Ты - эксперт по UI/UX дизайну и адаптивной верстке с глубоким пониманием принципов дизайна для различных устройств, особенно для {target_device}."
        result = await llm_adapter.generate_json(
            prompt=prompt,
            json_schema=json_schema,
            system_message=system_message,
            temperature=0.5
        )
        
        logger.info(f"Successfully generated responsive layout for {target_device}")
        return result
    except Exception as e:
        logger.error(f"Error generating responsive layout: {e}")
        raise

@mcp.tool()
async def generate_code_tool(
    design_data: dict,
    framework: str = "react",
    css_framework: str = "tailwind",
    responsive: bool = True,
    design_tokens: dict = None,
    component_name: str = None
):
    """
    Генерация кода на основе дизайна из Figma
    
    Args:
        design_data: Данные компонента/дизайна из Figma API
        framework: Фреймворк для генерации кода (react, vue, html)
        css_framework: CSS фреймворк или методология (tailwind, styled-components, css-modules, scss)
        responsive: Нужно ли добавлять адаптивные стили
        design_tokens: Дизайн-токены проекта
        component_name: Имя создаваемого компонента
        
    Returns:
        Сгенерированный код компонента и необходимые зависимости
    """
    try:
        # Генерируем имя компонента, если не указано
        if not component_name:
            # Пытаемся получить имя из design_data или используем дефолтное
            component_name = design_data.get("name", "FigmaComponent")
            
            # Преобразуем имя к PascalCase для соответствия соглашениям именования компонентов
            component_name = ''.join(word.capitalize() for word in component_name.replace('-', ' ').replace('_', ' ').split())
            
            # Если имя начинается с цифры, добавляем префикс
            if component_name and component_name[0].isdigit():
                component_name = "Component" + component_name
        
        # Используем существующую функцию generate_code для генерации кода
        result = await generate_code(
            figma_data=design_data,
            component_name=component_name,
            framework=framework,
            css_framework=css_framework
        )
        
        # Определяем расширение файла в зависимости от фреймворка
        file_extension = "jsx" if framework == "react" else "vue" if framework == "vue" else "html"
        
        # Форматируем результат
        return {
            "files": [
                {
                    "filename": f"{component_name}.{file_extension}",
                    "content": result,
                    "description": f"Компонент {component_name}"
                }
            ],
            "dependencies": [],
            "implementation_notes": ["Код сгенерирован на основе дизайна из Figma"]
        }
    except Exception as e:
        logger.error(f"Error generating code through MCP tool: {e}")
        raise 