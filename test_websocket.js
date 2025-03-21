const WebSocket = require('ws');

// Адрес вашего WebSocket сервера
const serverUrl = 'ws://localhost:8766';

// Создаем соединение
console.log(`Подключение к серверу: ${serverUrl}`);
const ws = new WebSocket(serverUrl);

// Вывод состояния соединения
function logState(ws) {
    const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
    console.log(`Состояние соединения: ${states[ws.readyState]} (${ws.readyState})`);
}

// Проверка состояния каждую секунду
const stateInterval = setInterval(() => {
    if (ws) {
        logState(ws);
    }
}, 1000);

// Обработка открытия соединения
ws.on('open', function() {
    console.log('Соединение установлено успешно!');
    logState(ws);
    
    // Отправляем тестовое сообщение
    const testMessage = { 
        type: 'PING', 
        payload: { time: new Date().toISOString() } 
    };
    
    console.log(`Отправка сообщения: ${JSON.stringify(testMessage)}`);
    ws.send(JSON.stringify(testMessage));
    
    // Отправляем еще одно сообщение через 2 секунды
    setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
            const testMessage2 = { 
                type: 'ECHO', 
                payload: { message: 'Привет, сервер!' } 
            };
            console.log(`Отправка второго сообщения: ${JSON.stringify(testMessage2)}`);
            ws.send(JSON.stringify(testMessage2));
        }
    }, 2000);
    
    // Закрываем соединение через 10 секунд
    setTimeout(() => {
        console.log('Закрываем соединение...');
        clearInterval(stateInterval);
        ws.close(1000, 'Тест завершен');
    }, 10000);
});

// Обработка сообщений от сервера
ws.on('message', function(data) {
    try {
        const message = JSON.parse(data);
        console.log('Получено сообщение от сервера:', message);
    } catch (error) {
        console.log('Получено сообщение (не JSON):', data.toString());
    }
});

// Обработка закрытия соединения
ws.on('close', function(code, reason) {
    console.log(`Соединение закрыто, код: ${code}, причина: ${reason || 'Не указана'}`);
    clearInterval(stateInterval);
    process.exit(0);
});

// Обработка ошибок
ws.on('error', function(error) {
    console.error('Ошибка WebSocket:', error.message);
    clearInterval(stateInterval);
    process.exit(1);
});

// Таймаут на подключение - 10 секунд
setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
        console.error('Не удалось подключиться к серверу в течение 10 секунд');
        clearInterval(stateInterval);
        process.exit(1);
    }
}, 10000); 