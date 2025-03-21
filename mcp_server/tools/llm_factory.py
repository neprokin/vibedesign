from typing import Dict, Any, Optional
from .llm_adapter import LLMAdapter
from .openai_adapter import OpenAIAdapter
from .logger import logger

class LLMFactory:
    """
    Фабрика для создания различных LLM-адаптеров
    """
    
    @staticmethod
    def create_adapter(adapter_type: str, config: Dict[str, Any] = None) -> LLMAdapter:
        """
        Создает и возвращает адаптер LLM указанного типа
        
        Args:
            adapter_type: Тип адаптера ('openai', 'anthropic', 'local' и т.д.)
            config: Конфигурация для адаптера
            
        Returns:
            Экземпляр LLMAdapter
            
        Raises:
            ValueError: Если указан неподдерживаемый тип адаптера
        """
        config = config or {}
        
        # Преобразуем тип адаптера к нижнему регистру для удобства
        adapter_type = adapter_type.lower()
        
        if adapter_type == 'openai':
            api_key = config.get('api_key')
            model = config.get('model', 'gpt-4')
            
            logger.info(f"Creating OpenAI adapter with model: {model}")
            return OpenAIAdapter(api_key=api_key, default_model=model)
            
        elif adapter_type == 'anthropic':
            # В будущем можно добавить адаптер для Anthropic Claude
            raise ValueError("Anthropic adapter not implemented yet")
            
        elif adapter_type == 'local':
            # Адаптер для локальных моделей (ollama, llama.cpp)
            raise ValueError("Local LLM adapter not implemented yet")
            
        else:
            raise ValueError(f"Unsupported LLM adapter type: {adapter_type}")
    
    @staticmethod
    def get_available_adapters() -> Dict[str, str]:
        """
        Возвращает словарь доступных адаптеров
        
        Returns:
            Словарь вида {'openai': 'OpenAI (GPT-4, GPT-3.5)', ...}
        """
        return {
            'openai': 'OpenAI (GPT-4, GPT-3.5)',
            # Другие адаптеры можно добавить по мере реализации
        } 