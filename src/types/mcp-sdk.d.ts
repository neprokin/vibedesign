declare module '@modelcontextprotocol/sdk' {
  export interface MCPRequest {
    env?: Record<string, string>;
    [key: string]: any;
  }

  export interface MCPToolOptions {
    name: string;
    description: string;
    parameterSchema: Record<string, any>;
    handler: (params: any, request: MCPRequest) => Promise<any>;
  }

  export interface MCPServerOptions {
    tools: any[];
    mode?: 'http' | 'stdio';
    httpServer?: any;
    expressApp?: any;
  }

  export function createMCPTool(options: MCPToolOptions): any;
  export function createMCPServer(options: MCPServerOptions): any;
} 