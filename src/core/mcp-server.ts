import { createServer } from 'http';
import express from 'express';
import { MCPRequest, createMCPServer, createMCPTool } from '@modelcontextprotocol/sdk';
import { MCPServerOptions } from '../types';
import { logger, LogLevel } from '../utils/logger';
import { getLogLevel } from '../utils/config';

/**
 * Класс MCP сервера
 */
export class MCPServer {
  private options: MCPServerOptions;
  private tools: Map<string, any> = new Map();
  private expressApp?: express.Express;
  private httpServer?: ReturnType<typeof createServer>;
  private mcpServer?: ReturnType<typeof createMCPServer>;

  /**
   * Конструктор
   * @param options - Опции сервера
   */
  constructor(options: MCPServerOptions) {
    this.options = options;
    
    // Устанавливаем уровень логирования
    logger.level = getLogLevel(options.verbose);
  }

  /**
   * Регистрация инструмента
   * @param name - Имя инструмента
   * @param handler - Обработчик инструмента
   * @param description - Описание инструмента
   * @param parameterSchema - Схема параметров
   */
  registerTool(
    name: string,
    handler: (params: any, request: MCPRequest) => Promise<any>,
    description: string,
    parameterSchema: Record<string, any>
  ): void {
    logger.debug(`Registering tool: ${name}`);
    
    const tool = createMCPTool({
      name,
      description,
      parameterSchema,
      handler,
    });
    
    this.tools.set(name, tool);
  }

  /**
   * Инициализация HTTP сервера
   */
  private initializeHttpServer(): void {
    logger.debug('Initializing HTTP server');
    
    this.expressApp = express();
    this.httpServer = createServer(this.expressApp);
    
    // CORS и парсинг JSON
    this.expressApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
    this.expressApp.use(express.json());
    
    // Добавляем базовый роут для проверки работоспособности
    this.expressApp.get('/', (req, res) => {
      res.json({ status: 'ok', service: 'figma-mcp' });
    });
  }

  /**
   * Инициализация MCP сервера
   */
  private initializeMCPServer(): void {
    logger.debug('Initializing MCP server');
    
    const mode = this.options.mode === 'stdio' ? 'stdio' : 'http';
    
    const tools = Array.from(this.tools.values());
    
    this.mcpServer = createMCPServer({
      tools,
      mode,
      httpServer: mode === 'http' ? this.httpServer : undefined,
      expressApp: mode === 'http' ? this.expressApp : undefined,
    });
  }

  /**
   * Запуск сервера
   */
  async start(): Promise<void> {
    try {
      if (this.options.mode === 'http') {
        this.initializeHttpServer();
        this.initializeMCPServer();
        
        const port = this.options.port || 3333;
        
        this.httpServer?.listen(port, () => {
          logger.info(`MCP server running in HTTP mode on port ${port}`);
        });
      } else {
        this.initializeMCPServer();
        logger.info('MCP server running in stdio mode');
      }
    } catch (error) {
      logger.error('Failed to start MCP server', error);
      throw error;
    }
  }

  /**
   * Остановка сервера
   */
  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (this.httpServer) {
          this.httpServer.close(() => {
            logger.info('MCP server stopped');
            resolve();
          });
        } else {
          logger.info('MCP server stopped');
          resolve();
        }
      } catch (error) {
        logger.error('Failed to stop MCP server', error);
        reject(error);
      }
    });
  }
} 