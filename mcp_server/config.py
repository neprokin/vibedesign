import os
import json
from pathlib import Path
from dotenv import load_dotenv
import sys

# Добавляем директорию mcp_server в sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mcp_server.types import MCPServerOptions

# Загружаем переменные окружения
load_dotenv()

def load_config(config_path: str = None) -> MCPServerOptions:
    """
    Загружает конфигурацию из файла или создает дефолтную
    
    Args:
        config_path: Путь к файлу конфигурации (если None, используются дефолтные значения)
        
    Returns:
        Экземпляр MCPServerOptions
    """
    # Дефолтные значения
    config_dict = {
        "server_name": "FigmaAutomation",
        "websocket_port": int(os.getenv("WEBSOCKET_PORT", "8765")),
        "api_port": int(os.getenv("API_PORT", "8000")),
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
        "figma_token": os.getenv("FIGMA_TOKEN"),
        "llm_config": {
            "adapter_type": os.getenv("LLM_ADAPTER_TYPE", "openai"),
            "model": os.getenv("LLM_MODEL", "gpt-4"),
            "api_key": os.getenv("OPENAI_API_KEY")  # Может быть None, адаптер возьмет из окружения
        },
        "cache_ttl": int(os.getenv("CACHE_TTL", "3600")),
        "templates_dir": os.getenv("TEMPLATES_DIR"),
        "plugins_dir": os.getenv("PLUGINS_DIR"),
        "cors_origins": os.getenv("CORS_ORIGINS", "*").split(",")
    }
    
    # Если путь к файлу конфигурации задан, пробуем загрузить из него
    if config_path:
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                file_config = json.load(f)
                
                # Обновляем дефолтную конфигурацию значениями из файла
                for key, value in file_config.items():
                    if key in config_dict:
                        if key == "llm_config" and isinstance(value, dict):
                            # Для вложенных словарей делаем merge
                            for llm_key, llm_value in value.items():
                                config_dict["llm_config"][llm_key] = llm_value
                        else:
                            config_dict[key] = value
        except Exception as e:
            print(f"Error loading config from {config_path}: {e}")
            print("Using default configuration...")
    
    # Создаем директории для шаблонов и плагинов, если они не указаны
    if not config_dict["templates_dir"]:
        base_dir = Path(__file__).parent
        config_dict["templates_dir"] = os.path.join(base_dir, "resources", "prompts")
    
    if not config_dict["plugins_dir"]:
        base_dir = Path(__file__).parent
        config_dict["plugins_dir"] = os.path.join(base_dir, "plugins")
    
    # Создаем директории, если не существуют
    os.makedirs(config_dict["templates_dir"], exist_ok=True)
    os.makedirs(config_dict["plugins_dir"], exist_ok=True)
    
    return MCPServerOptions.from_dict(config_dict)

def save_config(config: MCPServerOptions, config_path: str) -> bool:
    """
    Сохраняет конфигурацию в файл
    
    Args:
        config: Экземпляр MCPServerOptions
        config_path: Путь к файлу конфигурации
        
    Returns:
        True если успешно сохранено, иначе False
    """
    try:
        # Создаем директорию для файла конфигурации, если нужно
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        # Сохраняем конфигурацию в файл
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config.to_dict(), f, ensure_ascii=False, indent=2)
        
        return True
    except Exception as e:
        print(f"Error saving config to {config_path}: {e}")
        return False 