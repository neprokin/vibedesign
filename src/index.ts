import { config } from './utils/config';
import { logger } from './utils/logger';
import { MCPServer } from './core/mcp-server';
import { getFigmaDataDescription } from './tools/get-figma-data';
import { getStylesDescription } from './tools/get-styles';
import { getComponentsDescription } from './tools/get-components';
import { getDocumentInfoDescription } from './tools/get-document-info';
import { getSelectionDescription } from './tools/get-selection';
import { createFrameDescription } from './tools/create-frame';
import { createRectangleDescription } from './tools/create-rectangle';
import { createTextDescription } from './tools/create-text';
import { updateNodeDescription } from './tools/update-node';
import { deleteNodeDescription } from './tools/delete-node';
import { getDesignTokensDescription } from './tools/get-design-tokens';
import { createTokenCollectionDescription } from './tools/create-token-collection';
import { createDesignTokenDescription } from './tools/create-design-token';
import { exportDesignTokensDescription } from './tools/export-design-tokens';
import { getFigmaAuthUrlDescription } from './tools/get-figma-auth-url';
import { getFigmaTokenDescription } from './tools/get-figma-token';
import { getCachedFigmaDataDescription } from './tools/get-cached-figma-data';

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

    // Регистрируем инструменты чтения
    server.registerTool(
      getFigmaDataDescription.name,
      getFigmaDataDescription.handler,
      getFigmaDataDescription.description,
      getFigmaDataDescription.parameterSchema
    );

    server.registerTool(
      getStylesDescription.name,
      getStylesDescription.handler,
      getStylesDescription.description,
      getStylesDescription.parameterSchema
    );

    server.registerTool(
      getComponentsDescription.name,
      getComponentsDescription.handler,
      getComponentsDescription.description,
      getComponentsDescription.parameterSchema
    );

    server.registerTool(
      getDocumentInfoDescription.name,
      getDocumentInfoDescription.handler,
      getDocumentInfoDescription.description,
      getDocumentInfoDescription.parameterSchema
    );

    server.registerTool(
      getSelectionDescription.name,
      getSelectionDescription.handler,
      getSelectionDescription.description,
      getSelectionDescription.parameterSchema
    );

    // Регистрируем инструменты создания/редактирования
    server.registerTool(
      createFrameDescription.name,
      createFrameDescription.handler,
      createFrameDescription.description,
      createFrameDescription.parameterSchema
    );

    server.registerTool(
      createRectangleDescription.name,
      createRectangleDescription.handler,
      createRectangleDescription.description,
      createRectangleDescription.parameterSchema
    );

    server.registerTool(
      createTextDescription.name,
      createTextDescription.handler,
      createTextDescription.description,
      createTextDescription.parameterSchema
    );
    
    server.registerTool(
      updateNodeDescription.name,
      updateNodeDescription.handler,
      updateNodeDescription.description,
      updateNodeDescription.parameterSchema
    );

    server.registerTool(
      deleteNodeDescription.name,
      deleteNodeDescription.handler,
      deleteNodeDescription.description,
      deleteNodeDescription.parameterSchema
    );
    
    // Регистрируем инструменты для работы с дизайн-токенами
    server.registerTool(
      getDesignTokensDescription.name,
      getDesignTokensDescription.handler,
      getDesignTokensDescription.description,
      getDesignTokensDescription.parameterSchema
    );
    
    server.registerTool(
      createTokenCollectionDescription.name,
      createTokenCollectionDescription.handler,
      createTokenCollectionDescription.description,
      createTokenCollectionDescription.parameterSchema
    );
    
    server.registerTool(
      createDesignTokenDescription.name,
      createDesignTokenDescription.handler,
      createDesignTokenDescription.description,
      createDesignTokenDescription.parameterSchema
    );
    
    server.registerTool(
      exportDesignTokensDescription.name,
      exportDesignTokensDescription.handler,
      exportDesignTokensDescription.description,
      exportDesignTokensDescription.parameterSchema
    );
    
    // Регистрируем улучшенные инструменты для работы с Figma API
    server.registerTool(
      getFigmaAuthUrlDescription.name,
      getFigmaAuthUrlDescription.handler,
      getFigmaAuthUrlDescription.description,
      getFigmaAuthUrlDescription.parameterSchema
    );
    
    server.registerTool(
      getFigmaTokenDescription.name,
      getFigmaTokenDescription.handler,
      getFigmaTokenDescription.description,
      getFigmaTokenDescription.parameterSchema
    );
    
    server.registerTool(
      getCachedFigmaDataDescription.name,
      getCachedFigmaDataDescription.handler,
      getCachedFigmaDataDescription.description,
      getCachedFigmaDataDescription.parameterSchema
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