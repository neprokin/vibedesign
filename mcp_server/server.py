from fastmcp import FastMCP
from dotenv import load_dotenv
import os
from tools.figma_api import FigmaAPI
from tools.websocket import WebSocketServer
from tools.llm import LLMService
from tools.logger import logger

# Загрузка переменных окружения
load_dotenv()

# Инициализация сервисов
figma_api = FigmaAPI()
llm_service = LLMService()
ws_server = WebSocketServer()

# Инициализация MCP-сервера
mcp = FastMCP("FigmaAutomation")

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
        logger.error(f"Error updating Figma node: {e}")
        raise

@mcp.tool()
async def create_figma_node(type: str, properties: dict):
    """Создание нового узла в Figma"""
    try:
        await ws_server.broadcast("CREATE_NODE", {
            "type": type,
            "properties": properties
        })
        logger.info(f"Successfully sent create command for node type: {type}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error creating Figma node: {e}")
        raise

@mcp.tool()
async def delete_figma_node(
    file_key: str,
    node_id: str
):
    """Удаление узла в Figma"""
    try:
        payload = {
            "fileKey": file_key,
            "nodeId": node_id
        }
        
        await ws_server.broadcast("DELETE_NODE", payload)
        logger.info(f"Successfully sent delete command for node: {node_id}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error deleting Figma node: {e}")
        raise

@mcp.tool()
async def generate_component(description: str, context: dict):
    """Генерация вариантов UI-компонента"""
    try:
        variants = await llm_service.generate_component(description, context)
        logger.info(f"Successfully generated {len(variants)} component variants")
        return variants
    except Exception as e:
        logger.error(f"Error generating component: {e}")
        raise

@mcp.tool()
async def analyze_design(figma_data: dict):
    """Анализ дизайна и предложение улучшений"""
    try:
        analysis = await llm_service.analyze_design(figma_data)
        logger.info("Successfully analyzed design")
        return analysis
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

# Регистрация обработчиков WebSocket
@ws_server.register_handler("NODE_UPDATED")
async def handle_node_updated(websocket, payload):
    """Обработка подтверждения обновления узла"""
    logger.info(f"Node updated: {payload['nodeId']}")

@ws_server.register_handler("NODE_CREATED")
async def handle_node_created(websocket, payload):
    """Обработка подтверждения создания узла"""
    logger.info(f"Node created: {payload['nodeId']}")

@ws_server.register_handler("NODE_DELETED")
async def handle_node_deleted(websocket, payload):
    """Обработка подтверждения удаления узла"""
    logger.info(f"Node deleted: {payload['nodeId']}")

@ws_server.register_handler("ERROR")
async def handle_error(websocket, payload):
    """Обработка ошибок от плагина"""
    logger.error(f"Plugin error: {payload['message']}")

if __name__ == "__main__":
    # Запуск WebSocket сервера в отдельном потоке
    import asyncio
    loop = asyncio.get_event_loop()
    loop.create_task(ws_server.start())
    
    # Запуск MCP-сервера
    mcp.run(host="0.0.0.0", port=8000) 