import os
import logging
import datetime
from pathlib import Path

# Определение формата логирования
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Создаем директорию для логов, если её нет
logs_dir = Path(__file__).parent.parent / "logs"
os.makedirs(logs_dir, exist_ok=True)

# Создаем имя файла логов на основе текущей даты
log_file = logs_dir / f"mcp_server_{datetime.datetime.now().strftime('%Y-%m-%d')}.log"

# Настраиваем логгер
logger = logging.getLogger("mcp_server")
logger.setLevel(logging.INFO)

# Создаем обработчик для вывода в консоль
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_format = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
console_handler.setFormatter(console_format)

# Создаем обработчик для записи в файл
file_handler = logging.FileHandler(log_file, encoding="utf-8")
file_handler.setLevel(logging.INFO)
file_format = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
file_handler.setFormatter(file_format)

# Добавляем обработчики к логгеру
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# Функция для изменения уровня логирования
def set_log_level(level: str):
    """
    Устанавливает уровень логирования
    
    Args:
        level: Уровень логирования ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
    """
    numeric_level = getattr(logging, level.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f"Invalid log level: {level}")
    
    logger.setLevel(numeric_level)
    console_handler.setLevel(numeric_level)
    file_handler.setLevel(numeric_level) 