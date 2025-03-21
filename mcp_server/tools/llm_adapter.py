from abc import ABC, abstractmethod
from typing import Dict, Any, List, Union

class LLMAdapter(ABC):
    """
    Абстрактный класс для адаптеров различных LLM-сервисов
    """
    
    @abstractmethod
    async def send_prompt(self, 
                          prompt: str, 
                          system_message: str = None, 
                          temperature: float = 0.7, 
                          max_tokens: int = 1000) -> str:
        """
        Отправляет промпт в LLM и возвращает ответ в виде строки
        
        Args:
            prompt: Основной текст запроса
            system_message: Системное сообщение для установки контекста
            temperature: Параметр температуры для генерации (0.0-1.0)
            max_tokens: Максимальное количество токенов в ответе
            
        Returns:
            Строка с ответом от модели
        """
        pass
    
    @abstractmethod
    async def send_chat_prompt(self, 
                              messages: List[Dict[str, str]], 
                              temperature: float = 0.7, 
                              max_tokens: int = 1000) -> str:
        """
        Отправляет серию сообщений в формате чата и возвращает ответ
        
        Args:
            messages: Список сообщений в формате [{"role": "user/system/assistant", "content": "text"}]
            temperature: Параметр температуры для генерации (0.0-1.0)
            max_tokens: Максимальное количество токенов в ответе
            
        Returns:
            Строка с ответом от модели
        """
        pass
    
    @abstractmethod
    async def generate_json(self, 
                           prompt: str, 
                           json_schema: Dict[str, Any],
                           system_message: str = None,
                           temperature: float = 0.5) -> Dict[str, Any]:
        """
        Генерирует структурированный JSON на основе схемы
        
        Args:
            prompt: Основной текст запроса
            json_schema: JSON-схема для валидации ответа
            system_message: Системное сообщение для установки контекста
            temperature: Параметр температуры для генерации
            
        Returns:
            Структурированный JSON-ответ
        """
        pass
    
    @abstractmethod
    async def analyze_design(self, 
                            design_data: Dict[str, Any], 
                            criteria: List[str] = None) -> Dict[str, Any]:
        """
        Анализирует дизайн и предлагает улучшения
        
        Args:
            design_data: Данные дизайна для анализа
            criteria: Критерии, по которым нужно анализировать дизайн
            
        Returns:
            Результаты анализа
        """
        pass
    
    @abstractmethod
    async def generate_variants(self, 
                               description: str, 
                               context: Dict[str, Any], 
                               num_variants: int = 3) -> List[Dict[str, Any]]:
        """
        Генерирует варианты дизайна на основе описания
        
        Args:
            description: Описание компонента/дизайна для генерации
            context: Контекст дизайн-системы
            num_variants: Количество вариантов для генерации
            
        Returns:
            Список вариантов дизайна
        """
        pass
        
    @abstractmethod
    async def generate_code(self,
                           prompt: str,
                           framework: str = "react",
                           css_framework: str = "tailwind") -> str:
        """
        Генерирует код на основе описания или данных Figma
        
        Args:
            prompt: Описание или данные для генерации кода
            framework: Используемый фреймворк (react, vue, angular)
            css_framework: CSS фреймворк (tailwind, css, styled-components)
            
        Returns:
            Сгенерированный код
        """
        pass
        
    @abstractmethod
    async def generate_responsive_layout(self,
                                       prompt: str,
                                       breakpoints: List[str] = None) -> Dict[str, Any]:
        """
        Генерирует адаптивный макет для разных размеров экрана
        
        Args:
            prompt: Описание или данные для генерации макета
            breakpoints: Список точек излома (mobile, tablet, desktop)
            
        Returns:
            Сгенерированный адаптивный макет
        """
        pass 