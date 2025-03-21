import os
import json
from typing import Dict, Any, List, Optional
from pathlib import Path
import jinja2
from .logger import logger

class PromptManager:
    """
    Менеджер для работы с шаблонами промптов
    """
    
    def __init__(self, templates_dir: str = None):
        """
        Инициализация менеджера промптов
        
        Args:
            templates_dir: Путь к директории с шаблонами промптов
        """
        # Если директория не указана, используем дефолтный путь внутри проекта
        if templates_dir is None:
            base_dir = Path(__file__).parent.parent
            templates_dir = os.path.join(base_dir, "resources", "prompts")
        
        self.templates_dir = templates_dir
        
        # Создаем директорию с шаблонами, если она не существует
        os.makedirs(templates_dir, exist_ok=True)
        
        # Инициализируем Jinja2 для работы с шаблонами
        self.jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(templates_dir),
            autoescape=jinja2.select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Загружаем список доступных шаблонов
        self.templates = self._load_templates()
        
    def _load_templates(self) -> Dict[str, Dict[str, Any]]:
        """
        Загружает информацию о доступных шаблонах
        
        Returns:
            Словарь с информацией о шаблонах
        """
        templates = {}
        
        try:
            # Ищем все .j2 и .jinja2 файлы в директории шаблонов
            template_files = list(Path(self.templates_dir).glob("**/*.j2")) + \
                            list(Path(self.templates_dir).glob("**/*.jinja2"))
            
            for file_path in template_files:
                # Относительный путь к файлу относительно директории шаблонов
                rel_path = file_path.relative_to(self.templates_dir)
                template_name = str(rel_path).replace("\\", "/")
                
                # Извлекаем метаданные из первых строк файла (если они есть)
                metadata = self._extract_metadata(file_path)
                
                templates[template_name] = {
                    "name": template_name,
                    "path": str(file_path),
                    "description": metadata.get("description", ""),
                    "parameters": metadata.get("parameters", {}),
                    "category": metadata.get("category", "general")
                }
                
        except Exception as e:
            logger.error(f"Error loading prompt templates: {e}")
        
        return templates
    
    def _extract_metadata(self, file_path: Path) -> Dict[str, Any]:
        """
        Извлекает метаданные из шаблона промпта
        
        Args:
            file_path: Путь к файлу шаблона
            
        Returns:
            Словарь с метаданными
        """
        metadata = {
            "description": "",
            "parameters": {},
            "category": "general"
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            # Если файл начинается с блока комментариев {# ... #}
            if lines and lines[0].startswith('{#'):
                metadata_block = ""
                for i, line in enumerate(lines):
                    metadata_block += line
                    if line.strip().endswith('#}'):
                        break
                
                # Извлекаем метаданные между {# и #}
                start_idx = metadata_block.find('{#') + 2
                end_idx = metadata_block.find('#}')
                if start_idx != -1 and end_idx != -1:
                    metadata_str = metadata_block[start_idx:end_idx].strip()
                    
                    # Парсим YAML/JSON внутри блока комментариев
                    try:
                        import yaml
                        parsed_metadata = yaml.safe_load(metadata_str)
                        if isinstance(parsed_metadata, dict):
                            metadata.update(parsed_metadata)
                    except Exception as yaml_error:
                        logger.warning(f"Error parsing metadata as YAML: {yaml_error}")
                        
                        # Пробуем как JSON, если YAML не сработал
                        try:
                            parsed_metadata = json.loads(metadata_str)
                            if isinstance(parsed_metadata, dict):
                                metadata.update(parsed_metadata)
                        except Exception as json_error:
                            logger.warning(f"Error parsing metadata as JSON: {json_error}")
        
        except Exception as e:
            logger.error(f"Error extracting metadata from {file_path}: {e}")
        
        return metadata
    
    def get_template(self, template_name: str) -> Optional[Dict[str, Any]]:
        """
        Возвращает информацию о шаблоне по имени
        
        Args:
            template_name: Имя шаблона
            
        Returns:
            Словарь с информацией о шаблоне или None, если шаблон не найден
        """
        return self.templates.get(template_name)
    
    def list_templates(self, category: str = None) -> List[Dict[str, Any]]:
        """
        Возвращает список доступных шаблонов
        
        Args:
            category: Категория шаблонов (если указана)
            
        Returns:
            Список словарей с информацией о шаблонах
        """
        if category:
            return [t for t in self.templates.values() if t["category"] == category]
        else:
            return list(self.templates.values())
    
    def render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Рендерит шаблон с заданным контекстом
        
        Args:
            template_name: Имя шаблона
            context: Словарь с параметрами для шаблона
            
        Returns:
            Строка с отрендеренным шаблоном
            
        Raises:
            ValueError: Если шаблон не найден
        """
        if template_name not in self.templates:
            # Проверяем, может быть пользователь передал просто имя файла без расширения
            template_with_ext = f"{template_name}.j2"
            if template_with_ext in self.templates:
                template_name = template_with_ext
            else:
                raise ValueError(f"Template not found: {template_name}")
        
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            raise ValueError(f"Error rendering template: {e}")
    
    def create_template(self, template_name: str, content: str, metadata: Dict[str, Any] = None) -> bool:
        """
        Создает новый шаблон
        
        Args:
            template_name: Имя шаблона
            content: Содержимое шаблона
            metadata: Метаданные шаблона
            
        Returns:
            True если шаблон успешно создан, иначе False
        """
        if not template_name.endswith(('.j2', '.jinja2')):
            template_name = f"{template_name}.j2"
        
        file_path = os.path.join(self.templates_dir, template_name)
        
        try:
            # Создаем директории, если их нет
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Добавляем метаданные в начало файла, если они переданы
            if metadata:
                metadata_str = json.dumps(metadata, ensure_ascii=False, indent=2)
                content = f"{{# {metadata_str} #}}\n\n{content}"
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Обновляем список шаблонов
            self.templates = self._load_templates()
            return True
        except Exception as e:
            logger.error(f"Error creating template {template_name}: {e}")
            return False
    
    def delete_template(self, template_name: str) -> bool:
        """
        Удаляет шаблон
        
        Args:
            template_name: Имя шаблона
            
        Returns:
            True если шаблон успешно удален, иначе False
        """
        if template_name not in self.templates:
            return False
        
        file_path = self.templates[template_name]["path"]
        
        try:
            os.remove(file_path)
            # Обновляем список шаблонов
            self.templates = self._load_templates()
            return True
        except Exception as e:
            logger.error(f"Error deleting template {template_name}: {e}")
            return False 