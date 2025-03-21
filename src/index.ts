import { config } from './utils/config';
import { logger } from './utils/logger';
import { MCPServer } from './core/mcp-server';
import { getFigmaDataDescription } from './tools/get-figma-data';

/**
 * Запуск MCP сервера
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting MCP server', {
      mode: config.mode,
      port: config.port,
    });

    if (!config.figmaApiKey) {
      logger.error('Figma API key is not provided');
      process.exit(1);
    }

    // Создаем экземпляр MCP сервера
    const server = new MCPServer(config);

    // Регистрируем инструменты
    server.registerTool(
      getFigmaDataDescription.name,
      getFigmaDataDescription.handler,
      getFigmaDataDescription.description,
      getFigmaDataDescription.parameterSchema
    );

    // Запускаем сервер
    await server.start();

    // Обработка сигналов для корректного завершения
    const handleShutdown = async (): Promise<void> => {
      logger.info('Shutting down MCP server');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
  } catch (error) {
    logger.error('Failed to start MCP server', error);
    process.exit(1);
  }
}

// Запускаем сервер
startServer(); 