import asyncio
import sys
import os

# Получаем абсолютный путь к текущей директории
current_dir = os.path.dirname(os.path.abspath(__file__))
# Добавляем текущую директорию в sys.path
sys.path.insert(0, current_dir)

# Импортируем функцию generate_code напрямую
from server import generate_code

async def test_generate_code():
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
        print(f"Ошибка при генерации кода: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Запускаем тест
    success = asyncio.run(test_generate_code())
    print(f"Тест завершен: {'успешно' if success else 'с ошибкой'}") 