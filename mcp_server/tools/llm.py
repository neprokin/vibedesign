import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv
import openai

load_dotenv()

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        openai.api_key = self.api_key

    async def generate_component(self, description: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Генерация вариантов UI-компонента"""
        prompt = f"""
        Создай варианты UI-компонента на основе следующего описания:
        {description}
        
        Контекст дизайн-системы:
        {context}
        
        Верни 2-3 варианта в формате JSON с описанием структуры и стилей.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Ты - эксперт по UI/UX дизайну и разработке. Всегда используй дизайн-токены из контекста."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            return self._parse_response(response.choices[0].message.content)
        except Exception as e:
            print(f"Error generating component: {e}")
            return []

    async def analyze_design(self, figma_data: Dict[str, Any]) -> Dict[str, Any]:
        """Анализ дизайна и предложение улучшений"""
        prompt = f"""
        Проанализируй следующий дизайн и предложи улучшения:
        {figma_data}
        
        Обрати внимание на:
        1. Согласованность стилей
        2. Использование дизайн-токенов
        3. Возможные оптимизации
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Ты - эксперт по UI/UX дизайну."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=1000
            )
            
            return {
                "analysis": response.choices[0].message.content,
                "suggestions": self._extract_suggestions(response.choices[0].message.content)
            }
        except Exception as e:
            print(f"Error analyzing design: {e}")
            return {"analysis": "", "suggestions": []}

    def _parse_response(self, response: str) -> List[Dict[str, Any]]:
        """Парсинг ответа от LLM в структурированный формат"""
        try:
            # Пытаемся найти JSON в тексте
            start_idx = response.find('[')
            end_idx = response.rfind(']') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = response[start_idx:end_idx]
                return json.loads(json_str)
            
            # Если JSON не найден, пытаемся извлечь структурированные данные
            components = []
            current_component = {}
            
            for line in response.split('\n'):
                line = line.strip()
                if not line:
                    if current_component:
                        components.append(current_component)
                        current_component = {}
                    continue
                
                if ':' in line:
                    key, value = line.split(':', 1)
                    current_component[key.strip()] = value.strip()
            
            if current_component:
                components.append(current_component)
            
            return components
        except Exception as e:
            print(f"Error parsing response: {e}")
            return []

    def _extract_suggestions(self, analysis: str) -> List[str]:
        """Извлечение конкретных предложений из анализа"""
        suggestions = []
        
        # Ищем маркеры предложений
        markers = ['•', '-', '*', '1.', '2.', '3.']
        
        for line in analysis.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            # Проверяем, начинается ли строка с маркера
            if any(line.startswith(marker) for marker in markers):
                # Удаляем маркер и добавляем предложение
                suggestion = line.lstrip('•-* 123.')
                if suggestion:
                    suggestions.append(suggestion)
            # Ищем предложения после двоеточия
            elif ':' in line:
                suggestion = line.split(':', 1)[1].strip()
                if suggestion:
                    suggestions.append(suggestion)
        
        return suggestions 