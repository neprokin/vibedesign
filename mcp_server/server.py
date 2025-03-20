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
async def update_figma_node(node_id: str, updates: dict):
    """Обновление узла в Figma через плагин"""
    try:
        await ws_server.broadcast("UPDATE_NODE", {
            "nodeId": node_id,
            "updates": updates
        })
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
async def delete_figma_node(node_id: str):
    """Удаление узла в Figma"""
    try:
        await ws_server.broadcast("DELETE_NODE", {
            "nodeId": node_id
        })
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