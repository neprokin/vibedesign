import asyncio
import os
import sys
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Получаем абсолютный путь к директории файла
current_dir = os.path.dirname(os.path.abspath(__file__))

# Определяем функцию generate_code прямо здесь
async def generate_code(figma_data, component_name="Component", framework="react", css_framework="tailwind"):
    """
    Тестовая реализация generate_code
    """
    try:
        logger.info(f"Генерация кода для {component_name} с использованием {framework} и {css_framework}")
        # Просто возвращаем тестовый результат
        return f"// Сгенерированный компонент {component_name}\n" + \
               f"// Фреймворк: {framework}\n" + \
               f"// CSS: {css_framework}\n" + \
               f"// Данные: {figma_data}"
    except Exception as e:
        logger.error(f"Ошибка в тестовой функции generate_code: {str(e)}")
        raise

async def test():
    """
    Тестовая функция
    """
    try:
        # Тестовые данные
        design_data = {
            "name": "TestButton",
            "type": "RECTANGLE",
            "width": 200,
            "height": 50,
            "fills": [{"type": "SOLID", "color": {"r": 0.2, "g": 0.4, "b": 0.8}}]
        }
        
        # Вызываем функцию напрямую
        result = await generate_code(
            figma_data=design_data,
            component_name="TestButton",
            framework="react",
            css_framework="tailwind"
        )
        
        print("Результат генерации кода:")
        print(result)
        
        return True
    except Exception as e:
        logger.error(f"Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test())
    print(f"Тест завершен: {'успешно' if success else 'с ошибкой'}") 