import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/main.css';

// Немедленно монтируем React приложение, без ожидания DOMContentLoaded
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// Рендерим React-приложение
const root = createRoot(rootElement);
root.render(<App />);

// Информируем плагин, что UI загружен
parent.postMessage({ pluginMessage: { type: 'UI_LOADED' } }, '*');

// Функция для отправки сообщений в plugin.ts
export const sendToPlugin = (type: string, payload?: any) => {
  parent.postMessage(
    {
      pluginMessage: {
        type,
        payload,
      },
    },
    '*'
  );
}; 