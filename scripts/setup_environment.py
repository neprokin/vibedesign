#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Скрипт для настройки рабочего окружения MCP-сервера.
Запрашивает необходимые API-ключи и сохраняет их в .env файл.
"""

import os
import sys
import re
import platform
import getpass
from pathlib import Path
import subprocess
import shutil
import json

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

# Функция для проверки валидности API-ключей
def validate_openai_key(api_key):
    """Проверяет валидность OpenAI API ключа."""
    if not api_key or not re.match(r'^sk-[a-zA-Z0-9]{48}$', api_key):
        return False
    return True

def validate_figma_token(token):
    """Проверяет валидность Figma Personal Access Token."""
    if not token or not re.match(r'^figd_[a-zA-Z0-9_-]{43}$', token):
        return False
    return True

# Функция для создания .env файла
def create_env_file(figma_token, openai_key, mcp_port=5000, websocket_port=8765, log_level="INFO"):
    """Создает .env файл с настройками."""
    project_root = get_project_root()
    env_path = os.path.join(project_root, '.env')
    
    env_content = f"""# Figma API
FIGMA_ACCESS_TOKEN={figma_token}

# OpenAI API
OPENAI_API_KEY={openai_key}

# Портальные настройки
MCP_PORT={mcp_port}
WEBSOCKET_PORT={websocket_port}

# Конфигурация логирования
LOG_LEVEL={log_level}
LOG_FILE=logs/mcp_server.log

# Для производственного режима
TESTING_MODE=false
"""
    
    # Создаем директорию для логов
    logs_dir = os.path.join(project_root, 'mcp_server', 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Записываем .env файл
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    print(f"{Colors.GREEN}✅ .env файл успешно создан по пути: {env_path}{Colors.ENDC}")
    
    # Добавляем .env в .gitignore, если его еще нет там
    gitignore_path = os.path.join(project_root, '.gitignore')
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as f:
            gitignore_content = f.read()
        
        if '.env' not in gitignore_content:
            with open(gitignore_path, 'a') as f:
                f.write('\n# Environment variables\n.env\n')
            print(f"{Colors.GREEN}✅ .env добавлен в .gitignore{Colors.ENDC}")
    else:
        with open(gitignore_path, 'w') as f:
            f.write('# Environment variables\n.env\n')
        print(f"{Colors.GREEN}✅ Создан файл .gitignore с исключением .env{Colors.ENDC}")

# Функция для проверки зависимостей
def check_dependencies():
    """Проверяет наличие необходимых зависимостей."""
    project_root = get_project_root()
    requirements_path = os.path.join(project_root, 'requirements.txt')
    
    # Проверяем наличие файла requirements.txt
    if not os.path.exists(requirements_path):
        print(f"{Colors.WARNING}⚠️ Файл requirements.txt не найден. Создаем базовый файл...{Colors.ENDC}")
        with open(requirements_path, 'w') as f:
            f.write("""# Базовые зависимости для MCP-сервера
fastmcp>=0.1.4
openai>=1.0.0
websockets>=10.4
python-dotenv>=1.0.0
aiohttp>=3.8.5
jinja2>=3.1.2
jsonschema>=4.17.3
pyyaml>=6.0.1
pytest>=7.3.1
pytest-asyncio>=0.21.1
""")
        print(f"{Colors.GREEN}✅ Создан базовый файл requirements.txt{Colors.ENDC}")
    
    # Спрашиваем пользователя, хочет ли он установить зависимости
    install_deps = input(f"{Colors.BOLD}Установить зависимости из requirements.txt? (y/n): {Colors.ENDC}")
    if install_deps.lower() == 'y':
        print(f"{Colors.BLUE}Установка зависимостей...{Colors.ENDC}")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', requirements_path])
            print(f"{Colors.GREEN}✅ Зависимости успешно установлены{Colors.ENDC}")
        except subprocess.CalledProcessError:
            print(f"{Colors.FAIL}❌ Ошибка при установке зависимостей{Colors.ENDC}")
            return False
    
    return True

# Функция для настройки Figma плагина
def setup_figma_plugin():
    """Настраивает конфигурацию Figma плагина."""
    project_root = get_project_root()
    plugin_dir = os.path.join(project_root, 'figma_plugin')
    
    # Проверяем наличие директории плагина
    if not os.path.exists(plugin_dir):
        print(f"{Colors.WARNING}⚠️ Директория figma_plugin не найдена{Colors.ENDC}")
        return False
    
    # Находим файл с настройками WebSocket соединения
    websocket_config_files = [
        os.path.join(plugin_dir, 'src', 'services', 'websocket.ts'),
        os.path.join(plugin_dir, 'src', 'utils', 'websocket.ts'),
        os.path.join(plugin_dir, 'src', 'services', 'connection.ts')
    ]
    
    websocket_file = None
    for file_path in websocket_config_files:
        if os.path.exists(file_path):
            websocket_file = file_path
            break
    
    if websocket_file:
        print(f"{Colors.GREEN}✅ Найден файл конфигурации WebSocket: {websocket_file}{Colors.ENDC}")
        
        # Получаем локальный IP-адрес для настройки соединения
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        # Спрашиваем пользователя, какой IP-адрес использовать
        print(f"{Colors.BLUE}Ваш локальный IP-адрес: {local_ip}{Colors.ENDC}")
        use_ip = input(f"{Colors.BOLD}Использовать этот IP-адрес для соединения с плагином? (y/n, если n - будет использован localhost): {Colors.ENDC}")
        
        server_url = f"ws://{local_ip if use_ip.lower() == 'y' else 'localhost'}:8765"
        
        # Обновляем файл конфигурации
        try:
            with open(websocket_file, 'r') as f:
                content = f.read()
            
            # Ищем строку с определением SERVER_URL
            url_pattern = r'(?:const|let|var)\s+(?:SERVER_URL|WEBSOCKET_URL|WS_URL)\s*=\s*[\'"]ws://[^\'"]+'
            if re.search(url_pattern, content):
                content = re.sub(url_pattern, f"const SERVER_URL = '{server_url}", content)
                
                with open(websocket_file, 'w') as f:
                    f.write(content)
                
                print(f"{Colors.GREEN}✅ URL WebSocket сервера обновлен: {server_url}{Colors.ENDC}")
            else:
                print(f"{Colors.WARNING}⚠️ Не удалось найти определение URL в файле. Пожалуйста, обновите вручную URL: {server_url}{Colors.ENDC}")
        except Exception as e:
            print(f"{Colors.FAIL}❌ Ошибка при обновлении конфигурации плагина: {str(e)}{Colors.ENDC}")
            return False
        
        # Предложение собрать плагин
        build_plugin = input(f"{Colors.BOLD}Собрать плагин? (y/n): {Colors.ENDC}")
        if build_plugin.lower() == 'y':
            try:
                os.chdir(plugin_dir)
                subprocess.check_call(['npm', 'install'])
                subprocess.check_call(['npm', 'run', 'build'])
                print(f"{Colors.GREEN}✅ Плагин успешно собран{Colors.ENDC}")
            except subprocess.CalledProcessError:
                print(f"{Colors.FAIL}❌ Ошибка при сборке плагина{Colors.ENDC}")
                return False
    else:
        print(f"{Colors.WARNING}⚠️ Файл конфигурации WebSocket не найден. Пожалуйста, настройте соединение вручную.{Colors.ENDC}")
        return False
    
    return True

# Функция для проверки структуры MCP сервера
def check_mcp_server():
    """Проверяет структуру MCP сервера."""
    project_root = get_project_root()
    server_dir = os.path.join(project_root, 'mcp_server')
    
    # Проверяем наличие директории сервера
    if not os.path.exists(server_dir):
        print(f"{Colors.WARNING}⚠️ Директория mcp_server не найдена{Colors.ENDC}")
        return False
    
    # Проверяем наличие основных файлов
    required_files = [
        'server.py',
        'config.py',
        'tools/llm_adapter.py',
        'tools/openai_adapter.py',
        'tools/prompt_manager.py'
    ]
    
    missing_files = []
    for file in required_files:
        file_path = os.path.join(server_dir, file)
        if not os.path.exists(file_path):
            missing_files.append(file)
    
    if missing_files:
        print(f"{Colors.WARNING}⚠️ Отсутствуют следующие файлы:{Colors.ENDC}")
        for file in missing_files:
            print(f"   - {file}")
        return False
    
    print(f"{Colors.GREEN}✅ Структура MCP сервера корректна{Colors.ENDC}")
    return True

# Основная функция
def main():
    """Основная функция настройки окружения."""
    print(f"{Colors.HEADER}{Colors.BOLD}===== Настройка окружения для MCP-сервера ====={Colors.ENDC}")
    print(f"{Colors.BLUE}Этот скрипт поможет настроить рабочее окружение для MCP-сервера и Figma-плагина.{Colors.ENDC}")
    
    # Получаем API-ключи
    print(f"\n{Colors.HEADER}1. Настройка API-ключей{Colors.ENDC}")
    
    # OpenAI API Key
    openai_key = getpass.getpass(f"{Colors.BOLD}Введите ваш OpenAI API Key (начинается с 'sk-'): {Colors.ENDC}")
    while not validate_openai_key(openai_key):
        print(f"{Colors.FAIL}❌ Некорректный формат ключа. OpenAI API Key должен начинаться с 'sk-' и содержать 48 символов.{Colors.ENDC}")
        openai_key = getpass.getpass(f"{Colors.BOLD}Введите ваш OpenAI API Key: {Colors.ENDC}")
    
    # Figma Personal Access Token
    figma_token = getpass.getpass(f"{Colors.BOLD}Введите ваш Figma Personal Access Token (начинается с 'figd_'): {Colors.ENDC}")
    while not validate_figma_token(figma_token):
        print(f"{Colors.FAIL}❌ Некорректный формат токена. Figma Personal Access Token должен начинаться с 'figd_' и содержать примерно 43 символа.{Colors.ENDC}")
        figma_token = getpass.getpass(f"{Colors.BOLD}Введите ваш Figma Personal Access Token: {Colors.ENDC}")
    
    # Создаем .env файл
    mcp_port = input(f"{Colors.BOLD}Введите порт для MCP API [5000]: {Colors.ENDC}") or "5000"
    websocket_port = input(f"{Colors.BOLD}Введите порт для WebSocket [8765]: {Colors.ENDC}") or "8765"
    log_level = input(f"{Colors.BOLD}Введите уровень логирования [INFO]: {Colors.ENDC}") or "INFO"
    
    create_env_file(figma_token, openai_key, mcp_port, websocket_port, log_level)
    
    # Проверяем зависимости
    print(f"\n{Colors.HEADER}2. Проверка зависимостей{Colors.ENDC}")
    check_dependencies()
    
    # Проверяем структуру MCP сервера
    print(f"\n{Colors.HEADER}3. Проверка структуры MCP сервера{Colors.ENDC}")
    check_mcp_server()
    
    # Настраиваем Figma плагин
    print(f"\n{Colors.HEADER}4. Настройка Figma плагина{Colors.ENDC}")
    setup_figma_plugin()
    
    print(f"\n{Colors.GREEN}{Colors.BOLD}✅ Настройка окружения завершена!{Colors.ENDC}")
    print(f"{Colors.BLUE}Теперь вы можете запустить MCP-сервер:{Colors.ENDC}")
    print(f"   cd {get_project_root()}/mcp_server")
    print(f"   python server.py")
    print(f"{Colors.BLUE}И загрузить плагин в Figma через меню Plugins > Development > Import plugin from manifest...{Colors.ENDC}")

if __name__ == "__main__":
    main() 