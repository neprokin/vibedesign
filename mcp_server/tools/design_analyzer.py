import logging
from typing import Dict, List, Any
from tools.llm_factory import LLMFactory
from tools.logger import logger

async def analyze_design(design_data: Dict[str, Any], criteria: List[str] = None) -> Dict[str, Any]:
    """
    Анализирует дизайн с помощью LLM и возвращает результаты анализа.
    
    Args:
        design_data (Dict[str, Any]): Данные о дизайне из Figma
        criteria (List[str], optional): Критерии для анализа. По умолчанию ["accessibility", "consistency", "usability"]
    
    Returns:
        Dict[str, Any]: Результаты анализа
    """
    try:
        if criteria is None:
            criteria = ["accessibility", "consistency", "usability"]
            
        # Предварительная обработка дизайн-данных, чтобы улучшить анализ
        enhanced_data = enhance_design_data(design_data)
        
        # Получаем результат от LLM
        llm_adapter = LLMFactory.create_adapter("openai")  # Используем фабрику для создания адаптера
        result = await llm_adapter.analyze_design(enhanced_data, criteria)
        
        logger.info(f"Design analysis completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Error in analyze_design: {str(e)}", exc_info=True)
        raise

def enhance_design_data(design_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Улучшает данные дизайна, добавляя контекстную информацию и дополнительное описание
    в случаях, когда стандартные свойства (например, дочерние элементы) недоступны.
    
    Args:
        design_data (Dict[str, Any]): Оригинальные данные дизайна из плагина Figma
        
    Returns:
        Dict[str, Any]: Улучшенные данные дизайна
    """
    enhanced_data = {**design_data}  # Создаем копию исходных данных
    
    # Добавляем больше контекста для каждого узла
    if "nodes" in enhanced_data and isinstance(enhanced_data["nodes"], list):
        for i, node in enumerate(enhanced_data["nodes"]):
            if "name" in node and "type" in node:
                # Анализируем имя компонента для получения его назначения
                node_purpose = infer_node_purpose(node["name"], node["type"])
                if node_purpose:
                    node["inferred_purpose"] = node_purpose
                
                # Для контейнеров без дочерних элементов пытаемся понять, 
                # что могло бы быть внутри на основе имени и свойств
                if is_container_type(node["type"]) and (
                    "children" not in node.get("properties", {}) or
                    not node.get("properties", {}).get("children")
                ):
                    node["properties"] = node.get("properties", {})
                    node["properties"]["description"] = infer_container_contents(node)
    
    # Добавляем общий контекст о дизайне
    enhanced_data["design_context"] = {
        "component_type": infer_overall_component_type(enhanced_data),
        "likely_interactions": infer_interactions(enhanced_data)
    }
    
    return enhanced_data

def is_container_type(node_type: str) -> bool:
    """Определяет, является ли узел контейнером"""
    container_types = ["FRAME", "GROUP", "COMPONENT", "INSTANCE", "SECTION"]
    return node_type in container_types

def infer_node_purpose(name: str, node_type: str) -> str:
    """Выводит предполагаемое назначение узла на основе его имени и типа"""
    name_lower = name.lower()
    
    # Кнопки и действия
    if "button" in name_lower:
        return "Interactive button for user actions"
    elif "container" in name_lower:
        if "button" in name_lower:
            return "Container for button component with text and possibly icon"
        else:
            return "Container for grouping related elements"
    elif "label" in name_lower:
        return "Text label providing context or instruction"
    elif "icon" in name_lower:
        return "Visual indicator or action symbol"
    elif "input" in name_lower or "field" in name_lower:
        return "Text input field for user data entry"
    elif "card" in name_lower:
        return "Container for displaying content as a card"
    elif "menu" in name_lower:
        return "Navigation or selection menu"
    elif "header" in name_lower:
        return "Top section of interface containing navigation or branding"
    elif "footer" in name_lower:
        return "Bottom section of interface with secondary information"
    
    # Если имя не содержит известных ключевых слов, используем тип
    if node_type == "TEXT":
        return "Text element displaying information"
    elif node_type == "RECTANGLE":
        return "Basic shape, possibly used for background or decoration"
    
    return None

def infer_container_contents(node: Dict[str, Any]) -> str:
    """Выводит описание возможного содержимого контейнера на основе его имени и свойств"""
    name_lower = node.get("name", "").lower()
    
    # Анализируем имя
    if "button" in name_lower:
        # Пытаемся вывести текст кнопки из имени
        button_text = name_lower.replace("container", "").replace("button", "").strip()
        if not button_text:
            button_text = "Button"
        
        return f"Contains button text '{button_text.capitalize()}' and possibly an icon"
    
    # Анализируем размеры и вид
    properties = node.get("properties", {})
    width = properties.get("width", 0)
    height = properties.get("height", 0)
    
    # Определяем по размерам
    if width > 0 and height > 0:
        if width > height * 3:
            return "Wide container, likely containing horizontal content arrangement"
        elif height > width * 3:
            return "Tall container, likely containing vertical content arrangement"
        elif width <= 100 and height <= 50:
            return "Small container, possibly a button or icon container"
    
    # По умолчанию
    return "Container with undetermined contents"

def infer_overall_component_type(design_data: Dict[str, Any]) -> str:
    """Определяет общий тип компонента на основе всех данных"""
    nodes = design_data.get("nodes", [])
    if not nodes:
        return "Unknown component"
    
    names = [node.get("name", "").lower() for node in nodes]
    types = [node.get("type", "") for node in nodes]
    
    combined_text = " ".join(names)
    
    # Определяем по именам и типам
    if "button" in combined_text:
        return "Button component"
    elif "input" in combined_text or "field" in combined_text:
        return "Form input component"
    elif "card" in combined_text:
        return "Card component"
    elif "menu" in combined_text:
        return "Menu component"
    elif "FRAME" in types and (len(nodes) == 1 or types.count("FRAME") == 1):
        return "Container component"
    
    return "Generic UI component"

def infer_interactions(design_data: Dict[str, Any]) -> List[str]:
    """Определяет возможные взаимодействия на основе данных дизайна"""
    interactions = []
    
    nodes = design_data.get("nodes", [])
    for node in nodes:
        name_lower = node.get("name", "").lower()
        
        if "button" in name_lower:
            interactions.append("Click/tap to trigger action")
        elif "input" in name_lower or "field" in name_lower:
            interactions.append("Text input via keyboard/virtual keyboard")
        elif "slider" in name_lower:
            interactions.append("Drag to adjust value")
        elif "toggle" in name_lower or "switch" in name_lower:
            interactions.append("Click/tap to toggle state")
        elif "dropdown" in name_lower or "select" in name_lower:
            interactions.append("Click/tap to open selection menu")
    
    # Если не нашли конкретных взаимодействий
    if not interactions:
        if any(is_container_type(node.get("type", "")) for node in nodes):
            interactions.append("Potential container interactions depending on contents")
    
    return interactions 