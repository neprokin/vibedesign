const WebSocket = require('ws');

// Адрес WebSocket сервера
const serverUrl = 'ws://localhost:8768';
console.log(`Connecting to server at ${serverUrl}...`);

// Создаем WebSocket соединение
const ws = new WebSocket(serverUrl);

// Обработчик открытия соединения
ws.onopen = function() {
    console.log('Connected to server');
    
    // Отправка PING сообщения для проверки соединения
    console.log('Sending PING message...');
    ws.send(JSON.stringify({
        type: 'PING',
        payload: {
            time: new Date().toISOString()
        }
    }));
    
    // Через 2 секунды отправляем запрос на генерацию кода
    setTimeout(() => {
        console.log('Sending GENERATE_CODE_REQUEST...');
        ws.send(JSON.stringify({
            type: 'GENERATE_CODE_REQUEST',
            payload: {
                designData: {
                    name: 'TestComponent',
                    type: 'FRAME',
                    width: 200,
                    height: 100,
                    backgroundColor: '#FFFFFF',
                    children: []
                },
                framework: 'react',
                cssFramework: 'tailwind',
                componentName: 'TestComponent',
                responsive: true
            }
        }));
    }, 2000);
};

// Обработчик сообщений
ws.onmessage = function(event) {
    try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);
        console.log('Payload:', JSON.stringify(message.payload, null, 2));
        
        // Если получили ответ на генерацию кода, закрываем соединение
        if (message.type === 'GENERATE_CODE_COMPLETE') {
            console.log('Code generation complete, closing connection in 1 second...');
            setTimeout(() => {
                ws.close();
                process.exit(0);
            }, 1000);
        }
    } catch (e) {
        console.error('Error processing message:', e);
    }
};

// Обработчик ошибок
ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};

// Обработчик закрытия соединения
ws.onclose = function(event) {
    console.log(`Connection closed with code ${event.code}, reason: ${event.reason || 'No reason'}`);
    process.exit(0);
};

// Ловим сигналы прерывания для корректного завершения
process.on('SIGINT', () => {
    console.log('Interrupted, closing connection...');
    ws.close();
    process.exit(0);
}); 