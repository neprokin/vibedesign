from fastmcp import FastMCP
from dotenv import load_dotenv
import os
from tools.figma_api import FigmaAPI
from tools.websocket import WebSocketServer
from tools.llm_adapter import LLMAdapter
from tools.llm_factory import LLMFactory
from tools.prompt_manager import PromptManager
from tools.logger import logger
from config import load_config
import datetime
import random
import logging
from tools.design_analyzer import analyze_design

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

ws_server = WebSocketServer()

# Инициализация MCP-сервера
mcp = FastMCP(config.server_name)

# Регистрация обработчиков WebSocket-сообщений
@ws_server.register_handler("ANALYZE_DESIGN")
async def handle_analyze_design(websocket, payload):
    logger.info(f"Analyze design request received, payload: {payload}")
    try:
        # Проверка наличия выбранных элементов
        if not payload or not payload.get("hasSelection") or payload.get("count", 0) == 0:
            await ws_server.send_to_client(websocket, "ERROR", {
                "message": "No elements selected in Figma"
            })
            return

        # Подготавливаем данные для анализа
        figma_data = {
            "nodes": payload.get("nodes", [])
        }
        criteria = payload.get("criteria", ["accessibility", "consistency", "usability"])
        
        # Выполняем анализ дизайна
        analysis_result = await analyze_design(figma_data, criteria)
        
        # Отправляем результат анализа
        await ws_server.send_to_client(websocket, "ANALYSIS_RESULT", {
            "result": analysis_result,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        logger.info(f"Design analysis completed and sent to client")
    except Exception as e:
        error_message = f"Error analyzing design: {str(e)}"
        logger.error(error_message, exc_info=True)
        await ws_server.send_to_client(websocket, "ERROR", {
            "message": error_message
        })

@ws_server.register_handler("GENERATE_CODE")
async def handle_generate_code(websocket, payload):
    logger.info(f"Generate code request received, payload: {payload}")
    try:
        # Проверка наличия выбранных элементов
        if not payload or not payload.get("hasSelection") or payload.get("count", 0) == 0:
            await ws_server.send_to_client(websocket, "ERROR", {
                "message": "No elements selected in Figma"
            })
            return

        # Подготавливаем данные для генерации кода
        figma_data = {
            "nodes": payload.get("nodes", [])
        }
        component_name = payload.get("component_name", "Component")
        framework = payload.get("framework", "react")
        css_framework = payload.get("css_framework", "tailwind")
        
        # Генерируем код
        code_result = await generate_code(
            figma_data, 
            component_name=component_name,
            framework=framework,
            css_framework=css_framework
        )
        
        # Отправляем результат генерации кода
        await ws_server.send_to_client(websocket, "CODE_GENERATED", {
            "code": code_result,
            "component_name": component_name,
            "framework": framework,
            "css_framework": css_framework,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        logger.info(f"Code generation completed and sent to client")
    except Exception as e:
        error_message = f"Error generating code: {str(e)}"
        logger.error(error_message, exc_info=True)
        await ws_server.send_to_client(websocket, "ERROR", {
            "message": error_message
        })

@ws_server.register_handler("GENERATE_RESPONSIVE")
async def handle_generate_responsive(websocket, payload):
    logger.info(f"Generate responsive layout request received, payload: {payload}")
    try:
        # Проверка наличия выбранных элементов
        if not payload or not payload.get("hasSelection") or payload.get("count", 0) == 0:
            await ws_server.send_to_client(websocket, "ERROR", {
                "message": "No elements selected in Figma"
            })
            return

        # Подготавливаем данные для генерации адаптивного макета
        figma_data = {
            "nodes": payload.get("nodes", [])
        }
        breakpoints = payload.get("breakpoints", ["mobile", "tablet", "desktop"])
        
        # Генерируем адаптивный макет
        responsive_result = await generate_responsive_layout(figma_data, breakpoints)
        
        # Отправляем результат генерации адаптивного макета
        await ws_server.send_to_client(websocket, "RESPONSIVE_GENERATED", {
            "layout": responsive_result,
            "breakpoints": breakpoints,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        logger.info(f"Responsive layout generation completed and sent to client")
    except Exception as e:
        error_message = f"Error generating responsive layout: {str(e)}"
        logger.error(error_message, exc_info=True)
        await ws_server.send_to_client(websocket, "ERROR", {
            "message": error_message
        })

@ws_server.register_handler("GENERATE_VARIANTS")
async def handle_generate_variants(websocket, payload):
    logger.info(f"Generate variants request received, payload: {payload}")
    try:
        # Проверка наличия выбранных элементов
        if not payload or not payload.get("hasSelection") or payload.get("count", 0) == 0:
            await ws_server.send_to_client(websocket, "ERROR", {
                "message": "No elements selected in Figma"
            })
            return

        # Подготавливаем данные для генерации вариантов
        figma_data = {
            "nodes": payload.get("nodes", [])
        }
        variant_types = payload.get("variant_types", ["colors", "sizes", "states"])
        count = payload.get("count", 3)
        
        # Генерируем варианты
        variants_result = {
            "variants": [
                {
                    "name": f"Variant {i}",
                    "description": f"Автоматически сгенерированный вариант {i}",
                    "properties": {
                        "color": "#" + "".join([f"{random.randint(0, 255):02x}" for _ in range(3)]) if "colors" in variant_types else None,
                        "size": f"{random.choice(['S', 'M', 'L', 'XL'])}" if "sizes" in variant_types else None,
                        "state": random.choice(["default", "hover", "active", "disabled"]) if "states" in variant_types else None
                    }
                } for i in range(1, count + 1)
            ]
        }
        
        # Отправляем результат генерации вариантов
        await ws_server.send_to_client(websocket, "VARIANTS_GENERATED", {
            "variants": variants_result,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        logger.info(f"Variants generation completed and sent to client")
    except Exception as e:
        error_message = f"Error generating variants: {str(e)}"
        logger.error(error_message, exc_info=True)
        await ws_server.send_to_client(websocket, "ERROR", {
            "message": error_message
        })

@ws_server.register_handler("PING")
async def handle_ping(websocket, payload):
    logger.info(f"Ping received: {payload}")
    try:
        await ws_server.send_to_client(websocket, "PONG", {
            "message": "Server is alive",
            "received_at": payload.get("time") if payload and "time" in payload else None,
            "server_time": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error sending PONG response: {e}")

@ws_server.register_handler("ECHO")
async def handle_echo(websocket, payload):
    logger.info(f"Echo request received: {payload}")
    try:
        await ws_server.send_to_client(websocket, "ECHO_RESPONSE", {
            "original_message": payload,
            "server_time": datetime.datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error sending ECHO response: {e}")

# Запуск сервера
if __name__ == "__main__":
    # Запускаем WebSocket-сервер в отдельном потоке
    ws_server.start(8767)
    
    logger.info(f"Starting MCP server: {config.server_name}")
    logger.info(f"WebSocket server running on port: 8767")
    logger.info(f"Using LLM adapter: {config.llm_config.get('adapter_type')} with model: {config.llm_config.get('model')}")
    
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
    """Обновление узла в Figma через плагин"""
    try:
        if not properties or len(properties) == 0:
            raise ValueError("At least one property must be specified for update")
            
        payload = {
            "fileKey": file_key,
            "nodeId": node_id,
            "properties": properties
        }
        
        await ws_server.broadcast("UPDATE_NODE", payload)
        logger.info(f"Successfully sent update for node: {node_id}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error updating node: {e}")
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
async def generate_code(
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
        # Валидируем framework
        valid_frameworks = ["react", "vue", "html"]
        if framework not in valid_frameworks:
            framework = "react"  # Значение по умолчанию
        
        # Валидируем css_framework
        valid_css_frameworks = ["tailwind", "styled-components", "css-modules", "scss"]
        if css_framework not in valid_css_frameworks:
            css_framework = "tailwind"  # Значение по умолчанию
        
        # Генерируем имя компонента, если не указано
        if not component_name:
            # Пытаемся получить имя из design_data или используем дефолтное
            component_name = design_data.get("name", "FigmaComponent")
            
            # Преобразуем имя к PascalCase для соответствия соглашениям именования компонентов
            component_name = ''.join(word.capitalize() for word in component_name.replace('-', ' ').replace('_', ' ').split())
            
            # Если имя начинается с цифры, добавляем префикс
            if component_name and component_name[0].isdigit():
                component_name = "Component" + component_name
        
        # Рендерим шаблон промпта с переданными параметрами
        prompt_context = {
            "design_data": design_data,
            "framework": framework,
            "css_framework": css_framework,
            "responsive": responsive,
            "design_tokens": design_tokens or {},
            "component_name": component_name
        }
        
        # Формируем JSON-схему для валидации ответа
        json_schema = {
            "type": "object",
            "required": ["files", "dependencies", "implementation_notes"],
            "properties": {
                "files": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["filename", "content", "description"],
                        "properties": {
                            "filename": {"type": "string"},
                            "content": {"type": "string"},
                            "description": {"type": "string"}
                        }
                    }
                },
                "dependencies": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "version", "type"],
                        "properties": {
                            "name": {"type": "string"},
                            "version": {"type": "string"},
                            "type": {"type": "string", "enum": ["dev", "prod"]}
                        }
                    }
                },
                "implementation_notes": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
        
        # Генерируем промпт через менеджер шаблонов
        prompt = prompt_manager.render_template("generate_code.j2", prompt_context)
        
        # Отправляем промпт в LLM и получаем структурированный ответ
        system_message = f"Ты - опытный фронтенд-разработчик, эксперт по {framework} и {css_framework}. Ты создаешь чистый, легко поддерживаемый и высококачественный код на основе дизайнов из Figma."
        
        # Используем низкую температуру для генерации кода, чтобы получить более предсказуемый и корректный результат
        result = await llm_adapter.generate_json(
            prompt=prompt,
            json_schema=json_schema,
            system_message=system_message,
            temperature=0.2
        )
        
        logger.info(f"Successfully generated {framework} code with {css_framework} for {component_name}")
        return result
    except Exception as e:
        logger.error(f"Error generating code: {e}")
        raise

# Добавляем функции для генерации кода, адаптивного дизайна и вариантов, если их нет
async def generate_code(figma_data, component_name="Component", framework="react", css_framework="tailwind"):
    """
    Генерирует код на основе Figma дизайна
    
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
            "figma_data": figma_data,
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

async def generate_responsive_layout(figma_data, breakpoints=None):
    """
    Генерирует адаптивный макет на основе Figma дизайна
    
    Args:
        figma_data: Данные дизайна из Figma
        breakpoints: Список брейкпоинтов (mobile, tablet, desktop)
        
    Returns:
        dict: Сгенерированный адаптивный макет
    """
    try:
        if breakpoints is None:
            breakpoints = ["mobile", "tablet", "desktop"]
        
        # Формируем контекст для промпта
        prompt_context = {
            "figma_data": figma_data,
            "breakpoints": breakpoints
        }
        
        # Генерируем промпт с помощью шаблона (если шаблон есть)
        prompt = f"Generate responsive layout for breakpoints {breakpoints} based on Figma data"
        try:
            prompt = prompt_manager.render_template("generate_responsive.j2", prompt_context)
        except Exception as e:
            logger.warning(f"Error rendering prompt template: {e}. Using default prompt.")
        
        # Получаем результат от LLM
        responsive_result = await llm_adapter.generate_responsive_layout(prompt, breakpoints)
        return responsive_result
    except Exception as e:
        logger.error(f"Error in generate_responsive_layout: {str(e)}", exc_info=True)
        raise 