import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv
from openai import AsyncOpenAI
import jsonschema
from .llm_adapter import LLMAdapter
from .logger import logger

# Загружаем переменные окружения
load_dotenv()

class OpenAIAdapter(LLMAdapter):
    """
    Адаптер для работы с OpenAI API (GPT-4, GPT-3.5-turbo)
    """
    
    def __init__(self, api_key: str = None, default_model: str = "gpt-4"):
        """
        Инициализация адаптера OpenAI
        
        Args:
            api_key: API ключ OpenAI (если None, берется из переменной окружения)
            default_model: Модель по умолчанию ("gpt-4", "gpt-3.5-turbo" и т.д.)
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        self.default_model = default_model
        self.client = AsyncOpenAI(api_key=self.api_key)
    
    async def send_prompt(self, 
                         prompt: str, 
                         system_message: str = None, 
                         temperature: float = 0.7, 
                         max_tokens: int = 1000) -> str:
        """
        Отправляет промпт в OpenAI и возвращает ответ
        """
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        
        messages.append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat.completions.create(
                model=self.default_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in OpenAI prompt: {e}")
            raise
    
    async def send_chat_prompt(self, 
                              messages: List[Dict[str, str]], 
                              temperature: float = 0.7, 
                              max_tokens: int = 1000) -> str:
        """
        Отправляет серию сообщений в формате чата
        """
        try:
            response = await self.client.chat.completions.create(
                model=self.default_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error in OpenAI chat prompt: {e}")
            raise
    
    async def generate_json(self, 
                           prompt: str, 
                           json_schema: Dict[str, Any],
                           system_message: str = None,
                           temperature: float = 0.5) -> Dict[str, Any]:
        """
        Генерирует структурированный JSON на основе схемы
        """
        schema_str = json.dumps(json_schema, ensure_ascii=False, indent=2)
        
        if not system_message:
            system_message = """
            Ты - помощник, который создаёт структурированные JSON ответы. 
            Твой ответ должен быть валидным JSON согласно предоставленной схеме.
            Верни только JSON, без дополнительного текста или комментариев.
            """
        
        prompt_with_schema = f"""
        {prompt}
        
        Твой ответ должен быть в формате JSON и соответствовать следующей схеме:
        {schema_str}
        
        Верни только валидный JSON, без пояснений.
        """
        
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                response_text = await self.send_prompt(
                    prompt=prompt_with_schema,
                    system_message=system_message,
                    temperature=temperature
                )
                
                # Извлекаем JSON из ответа
                json_start = response_text.find("{")
                json_end = response_text.rfind("}") + 1
                
                if json_start != -1 and json_end > json_start:
                    json_str = response_text[json_start:json_end]
                    json_data = json.loads(json_str)
                    
                    # Валидируем JSON по схеме
                    jsonschema.validate(instance=json_data, schema=json_schema)
                    return json_data
                
                # Если не удалось извлечь JSON, пытаемся ещё раз
                logger.warning(f"Failed to extract JSON from response (attempt {attempt+1}/{max_attempts})")
            except json.JSONDecodeError as e:
                logger.warning(f"JSON decode error (attempt {attempt+1}/{max_attempts}): {e}")
            except jsonschema.exceptions.ValidationError as e:
                logger.warning(f"JSON validation error (attempt {attempt+1}/{max_attempts}): {e}")
            except Exception as e:
                logger.error(f"Unexpected error in generate_json: {e}")
                raise
        
        # Если все попытки не удались
        raise ValueError("Failed to generate valid JSON after multiple attempts")
    
    async def analyze_design(self, 
                            design_data: Dict[str, Any], 
                            criteria: List[str] = None) -> Dict[str, Any]:
        """
        Анализирует дизайн и предлагает улучшения
        """
        # Конвертируем дизайн-данные в строку JSON
        design_json = json.dumps(design_data, ensure_ascii=False)
        
        # Определяем, какой тип данных нам предоставлен
        has_enhanced_data = "design_context" in design_data
        has_inferred_properties = any("inferred_purpose" in node for node in design_data.get("nodes", []))
        
        # Формируем инструкцию для обработки улучшенных или неполных данных
        enhanced_instructions = ""
        if has_enhanced_data or has_inferred_properties:
            enhanced_instructions = """
            Некоторые аспекты дизайна были определены алгоритмически на основе имен и свойств элементов:
            1. Поле "inferred_purpose" содержит алгоритмически определенное назначение элемента
            2. Поле "description" в properties может содержать предполагаемое содержание контейнера
            3. Поле "design_context" содержит дополнительный контекст о компоненте в целом
            
            Используй эту информацию для более глубокого анализа, особенно когда дочерние элементы не видны через API.
            """
        
        # Формируем критерии для анализа
        criteria_text = ""
        if criteria and len(criteria) > 0:
            criteria_text = "Обрати особое внимание на следующие критерии:\n"
            for i, criterion in enumerate(criteria, 1):
                criteria_text += f"{i}. {criterion}\n"
        
        prompt = f"""
        Проанализируй следующий дизайн Figma и предложи улучшения:
        
        {design_json}
        
        {criteria_text}
        
        {enhanced_instructions}
        
        Учитывай контекст и назначение компонента. Если в данных не хватает детальной информации о содержимом контейнеров,
        делай разумные предположения на основе имени, размеров и других свойств элемента.
        
        Верни JSON с двумя полями:
        1. "analysis" - общий анализ дизайна
        2. "suggestions" - список конкретных предложений по улучшению
        """
        
        json_schema = {
            "type": "object",
            "required": ["analysis", "suggestions"],
            "properties": {
                "analysis": {"type": "string"},
                "suggestions": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
        
        return await self.generate_json(
            prompt=prompt,
            json_schema=json_schema,
            system_message="Ты - эксперт по UI/UX дизайну с глубоким пониманием принципов дизайна и Figma.",
            temperature=0.5
        )
    
    async def generate_variants(self, 
                               description: str, 
                               context: Dict[str, Any], 
                               num_variants: int = 3) -> List[Dict[str, Any]]:
        """
        Генерирует варианты дизайна на основе описания
        """
        context_json = json.dumps(context, ensure_ascii=False)
        
        prompt = f"""
        Создай {num_variants} варианта UI-компонента на основе следующего описания:
        
        {description}
        
        Контекст дизайн-системы:
        {context_json}
        
        Для каждого варианта опиши:
        1. Структуру (типы узлов, вложенность)
        2. Визуальные стили (цвета, шрифты, размеры)
        3. Интерактивные состояния (если применимо)
        
        Верни JSON-массив вариантов.
        """
        
        json_schema = {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "structure", "styles"],
                "properties": {
                    "name": {"type": "string"},
                    "structure": {"type": "object"},
                    "styles": {"type": "object"},
                    "states": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["name", "changes"],
                            "properties": {
                                "name": {"type": "string"},
                                "changes": {"type": "object"}
                            }
                        }
                    }
                }
            }
        }
        
        return await self.generate_json(
            prompt=prompt,
            json_schema=json_schema,
            system_message="Ты - эксперт по UI/UX дизайну. Используй только токены из контекста дизайн-системы.",
            temperature=0.7
        )
        
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
        system_message = f"""
        Ты - опытный frontend-разработчик, специализирующийся на {framework} и {css_framework}. 
        Твоя задача - создавать чистый, семантически правильный и доступный код на основе дизайна из Figma.
        Следуй лучшим практикам разработки для {framework} и оптимизируй код для производительности.
        """
        
        try:
            code = await self.send_prompt(
                prompt=prompt,
                system_message=system_message,
                temperature=0.4,
                max_tokens=2000
            )
            
            # Если код обёрнут в кодовые блоки markdown, извлекаем его
            if "```" in code:
                # Извлекаем код из кодовых блоков markdown
                code_blocks = []
                lines = code.split('\n')
                in_code_block = False
                current_block = []
                
                for line in lines:
                    if line.startswith("```"):
                        if in_code_block:
                            code_blocks.append('\n'.join(current_block))
                            current_block = []
                        in_code_block = not in_code_block
                        continue
                    
                    if in_code_block:
                        current_block.append(line)
                
                if code_blocks:
                    # Объединяем все блоки кода
                    return '\n\n'.join(code_blocks)
            
            return code
        except Exception as e:
            logger.error(f"Error in generate_code: {e}")
            raise
            
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
        if breakpoints is None:
            breakpoints = ["mobile", "tablet", "desktop"]
            
        breakpoints_str = ', '.join(breakpoints)
        
        system_message = f"""
        Ты - эксперт по адаптивному дизайну, специализирующийся на создании 
        отзывчивых макетов, которые хорошо работают на разных устройствах.
        Твоя задача - предложить адаптации дизайна для следующих брейкпоинтов: {breakpoints_str}.
        """
        
        prompt_with_breakpoints = f"""
        {prompt}
        
        Создай адаптивный макет для следующих брейкпоинтов: {breakpoints_str}.
        
        Для каждого брейкпоинта опиши:
        1. Изменения в расположении элементов
        2. Изменения размеров и отступов
        3. Особенности адаптации для конкретного размера экрана
        """
        
        json_schema = {
            "type": "object",
            "required": ["layout", "breakpoints"],
            "properties": {
                "layout": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "object",
                        "required": ["width", "changes", "description"],
                        "properties": {
                            "width": {"type": "string"},
                            "changes": {"type": "array", "items": {"type": "string"}},
                            "description": {"type": "string"}
                        }
                    }
                },
                "breakpoints": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }
        
        try:
            return await self.generate_json(
                prompt=prompt_with_breakpoints,
                json_schema=json_schema,
                system_message=system_message,
                temperature=0.5
            )
        except Exception as e:
            logger.error(f"Error in generate_responsive_layout: {e}")
            raise 