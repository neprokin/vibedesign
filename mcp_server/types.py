from typing import Dict, Any, List, Optional, Union

class MCPServerOptions:
    """
    Опции для настройки MCP-сервера
    """
    
    def __init__(
        self,
        server_name: str = "FigmaAutomation",
        websocket_port: int = 8765,
        api_port: int = 8000,
        log_level: str = "INFO",
        figma_token: str = None,
        llm_config: Dict[str, Any] = None,
        cache_ttl: int = 3600,
        templates_dir: str = None,
        plugins_dir: str = None,
        cors_origins: List[str] = None
    ):
        """
        Инициализация опций MCP-сервера
        
        Args:
            server_name: Имя сервера
            websocket_port: Порт для WebSocket-сервера
            api_port: Порт для REST API
            log_level: Уровень логирования
            figma_token: Токен Figma API
            llm_config: Конфигурация для LLM (тип модели, API ключи и т.д.)
            cache_ttl: Время жизни кэша в секундах
            templates_dir: Путь к директории с шаблонами промптов
            plugins_dir: Путь к директории с плагинами
            cors_origins: Список разрешенных источников для CORS
        """
        self.server_name = server_name
        self.websocket_port = websocket_port
        self.api_port = api_port
        self.log_level = log_level
        self.figma_token = figma_token
        self.llm_config = llm_config or {
            "adapter_type": "openai",
            "model": "gpt-4",
            "api_key": None  # Берётся из переменной окружения
        }
        self.cache_ttl = cache_ttl
        self.templates_dir = templates_dir
        self.plugins_dir = plugins_dir
        self.cors_origins = cors_origins or ["*"]
    
    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> 'MCPServerOptions':
        """
        Создает экземпляр класса из словаря
        
        Args:
            config_dict: Словарь с конфигурацией
            
        Returns:
            Экземпляр MCPServerOptions
        """
        return cls(**config_dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Конвертирует настройки в словарь
        
        Returns:
            Словарь с настройками
        """
        return {
            "server_name": self.server_name,
            "websocket_port": self.websocket_port,
            "api_port": self.api_port,
            "log_level": self.log_level,
            "figma_token": self.figma_token,
            "llm_config": self.llm_config,
            "cache_ttl": self.cache_ttl,
            "templates_dir": self.templates_dir,
            "plugins_dir": self.plugins_dir,
            "cors_origins": self.cors_origins
        }

class FigmaNode:
    """
    Представление узла Figma в стандартизированном формате
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        type: str,
        visible: bool = True,
        x: float = 0,
        y: float = 0,
        width: float = 0,
        height: float = 0,
        fills: List[Dict[str, Any]] = None,
        strokes: List[Dict[str, Any]] = None,
        characters: str = None,
        style: Dict[str, Any] = None,
        children: List['FigmaNode'] = None,
        properties: Dict[str, Any] = None
    ):
        self.id = id
        self.name = name
        self.type = type
        self.visible = visible
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.fills = fills or []
        self.strokes = strokes or []
        self.characters = characters
        self.style = style or {}
        self.children = children or []
        self.properties = properties or {}
    
    @classmethod
    def from_dict(cls, node_dict: Dict[str, Any]) -> 'FigmaNode':
        """
        Создает экземпляр узла из словаря
        
        Args:
            node_dict: Словарь с данными узла
            
        Returns:
            Экземпляр FigmaNode
        """
        # Обрабатываем рекурсивно дочерние узлы
        children = []
        if "children" in node_dict and isinstance(node_dict["children"], list):
            children = [cls.from_dict(child) for child in node_dict["children"]]
        
        # Извлекаем базовые свойства
        node = cls(
            id=node_dict.get("id", ""),
            name=node_dict.get("name", ""),
            type=node_dict.get("type", ""),
            visible=node_dict.get("visible", True),
            children=children
        )
        
        # Обрабатываем позицию и размеры
        if "absoluteBoundingBox" in node_dict:
            bbox = node_dict["absoluteBoundingBox"]
            node.x = bbox.get("x", 0)
            node.y = bbox.get("y", 0)
            node.width = bbox.get("width", 0)
            node.height = bbox.get("height", 0)
        
        # Обрабатываем стили
        if "fills" in node_dict:
            node.fills = node_dict["fills"]
        if "strokes" in node_dict:
            node.strokes = node_dict["strokes"]
        if "characters" in node_dict:
            node.characters = node_dict["characters"]
        if "style" in node_dict:
            node.style = node_dict["style"]
        
        # Копируем остальные свойства
        for key, value in node_dict.items():
            if key not in ["id", "name", "type", "visible", "absoluteBoundingBox", 
                          "fills", "strokes", "characters", "style", "children"]:
                node.properties[key] = value
        
        return node
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Конвертирует узел в словарь
        
        Returns:
            Словарь с данными узла
        """
        result = {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "visible": self.visible,
            "absoluteBoundingBox": {
                "x": self.x,
                "y": self.y,
                "width": self.width,
                "height": self.height
            }
        }
        
        if self.fills:
            result["fills"] = self.fills
        if self.strokes:
            result["strokes"] = self.strokes
        if self.characters:
            result["characters"] = self.characters
        if self.style:
            result["style"] = self.style
        if self.children:
            result["children"] = [child.to_dict() for child in self.children]
        
        # Добавляем остальные свойства
        for key, value in self.properties.items():
            result[key] = value
        
        return result

class DesignToken:
    """
    Представление дизайн-токена
    """
    
    def __init__(
        self,
        id: str,
        name: str,
        type: str,
        value: Any,
        collection_id: str,
        group: str = None,
        description: str = None,
        metadata: Dict[str, Any] = None
    ):
        self.id = id
        self.name = name
        self.type = type
        self.value = value
        self.collection_id = collection_id
        self.group = group or "default"
        self.description = description
        self.metadata = metadata or {}
    
    @classmethod
    def from_dict(cls, token_dict: Dict[str, Any]) -> 'DesignToken':
        """
        Создает экземпляр токена из словаря
        
        Args:
            token_dict: Словарь с данными токена
            
        Returns:
            Экземпляр DesignToken
        """
        return cls(
            id=token_dict.get("id", ""),
            name=token_dict.get("name", ""),
            type=token_dict.get("type", ""),
            value=token_dict.get("value"),
            collection_id=token_dict.get("collection_id", ""),
            group=token_dict.get("group"),
            description=token_dict.get("description"),
            metadata=token_dict.get("metadata", {})
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Конвертирует токен в словарь
        
        Returns:
            Словарь с данными токена
        """
        result = {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "value": self.value,
            "collection_id": self.collection_id,
            "group": self.group
        }
        
        if self.description:
            result["description"] = self.description
        if self.metadata:
            result["metadata"] = self.metadata
        
        return result 