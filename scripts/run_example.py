#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Скрипт для запуска тестового примера использования MCP-сервера и Figma-плагина.
"""

import os
import sys
import subprocess
import time
import webbrowser
import threading
import signal
import platform
from pathlib import Path

# Цвета для вывода в терминал
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Функция для получения корневой директории проекта
def get_project_root():
    """Определяет корневую директорию проекта."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    return project_root

# Функция для запуска MCP-сервера в отдельном потоке
def run_mcp_server():
    """Запускает MCP-сервер в отдельном потоке."""
    project_root = get_project_root()
    server_script = os.path.join(project_root, 'mcp_server', 'server.py')
    
    # Проверяем наличие файла сервера
    if not os.path.exists(server_script):
        print(f"{Colors.FAIL}❌ Файл сервера не найден: {server_script}{Colors.ENDC}")
        sys.exit(1)
    
    # Запускаем сервер в отдельном процессе
    try:
        os.chdir(os.path.join(project_root, 'mcp_server'))
        env = os.environ.copy()
        
        # Проверяем наличие файла .env
        env_file = os.path.join(project_root, '.env')
        if not os.path.exists(env_file):
            print(f"{Colors.WARNING}⚠️ Файл .env не найден. Запустите сначала scripts/setup_environment.py{Colors.ENDC}")
            sys.exit(1)
        
        # На Windows используем python, на Unix-системах - python3
        python_exe = 'python' if platform.system() == 'Windows' else 'python3'
        
        # Запускаем сервер и перенаправляем его вывод
        process = subprocess.Popen(
            [python_exe, 'server.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            universal_newlines=True,
            bufsize=1
        )
        
        # Обрабатываем вывод сервера
        for line in iter(process.stdout.readline, ''):
            # Ищем сообщение о запуске сервера
            if "MCP server running" in line or "Server started" in line:
                print(f"{Colors.GREEN}✅ MCP-сервер успешно запущен!{Colors.ENDC}")
            
            # Выводим все строки лога
            print(line, end='')
        
        process.stdout.close()
        return_code = process.wait()
        
        if return_code != 0:
            print(f"{Colors.FAIL}❌ MCP-сервер завершился с ошибкой (код {return_code}){Colors.ENDC}")
            sys.exit(1)
    
    except Exception as e:
        print(f"{Colors.FAIL}❌ Ошибка при запуске MCP-сервера: {str(e)}{Colors.ENDC}")
        sys.exit(1)

# Функция для открытия Figma в браузере
def open_figma():
    """Открывает Figma в браузере по умолчанию."""
    figma_url = "https://www.figma.com/file/new"
    webbrowser.open(figma_url)
    print(f"{Colors.GREEN}✅ Открыт новый файл Figma в браузере{Colors.ENDC}")

# Функция для отображения инструкций
def show_instructions():
    """Отображает инструкции по использованию."""
    print(f"\n{Colors.HEADER}{Colors.BOLD}===== Инструкции по использованию ====={Colors.ENDC}")
    print(f"\n{Colors.BLUE}1. В Figma выберите меню:{Colors.ENDC}")
    print(f"   Plugins > Development > Import plugin from manifest...")
    print(f"   и выберите файл {get_project_root()}/figma_plugin/manifest.json")
    
    print(f"\n{Colors.BLUE}2. После импорта плагина запустите его:{Colors.ENDC}")
    print(f"   Plugins > Development > [Название вашего плагина]")
    
    print(f"\n{Colors.BLUE}3. В интерфейсе плагина:{Colors.ENDC}")
    print(f"   - Убедитесь, что статус подключения показывает 'Connected'")
    print(f"   - Выберите элемент дизайна")
    print(f"   - Используйте инструменты в плагине (например, 'Analyze Design')")
    
    print(f"\n{Colors.BLUE}4. Для тестирования рабочего процесса:{Colors.ENDC}")
    print(f"   - Создайте простой компонент (например, кнопку)")
    print(f"   - Проанализируйте его через плагин")
    print(f"   - Попробуйте сгенерировать код")
    
    print(f"\n{Colors.WARNING}Для остановки сервера нажмите Ctrl+C в этом терминале{Colors.ENDC}")

# Функция для установки обработчика сигнала завершения
def set_exit_handler():
    """Устанавливает обработчик для корректного завершения сервера."""
    def exit_handler(signal, frame):
        print(f"\n{Colors.WARNING}Остановка MCP-сервера...{Colors.ENDC}")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, exit_handler)
    signal.signal(signal.SIGTERM, exit_handler)

# Основная функция
def main():
    """Основная функция для запуска тестового примера."""
    print(f"{Colors.HEADER}{Colors.BOLD}===== Запуск тестового примера MCP-сервер + Figma ====={Colors.ENDC}")
    
    # Устанавливаем обработчик сигналов
    set_exit_handler()
    
    # Спрашиваем, нужно ли открыть Figma
    open_figma_browser = input(f"{Colors.BOLD}Открыть Figma в браузере? (y/n): {Colors.ENDC}")
    if open_figma_browser.lower() == 'y':
        open_figma()
    
    # Показываем инструкции
    show_instructions()
    
    print(f"\n{Colors.BLUE}Запуск MCP-сервера...{Colors.ENDC}")
    
    # Запускаем MCP-сервер (эта функция будет блокировать выполнение до завершения сервера)
    run_mcp_server()

if __name__ == "__main__":
    main() 