interface Tool {
  name: string;
  description: string;
  execute: (...args: any[]) => Promise<any>;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool>;

  private constructor() {
    this.tools = new Map();
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  public async executeTool(name: string, ...args: any[]): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool.execute(...args);
  }
}

export const initializeToolRegistry = (): void => {
  const registry = ToolRegistry.getInstance();

  // Register default tools here
  // Example:
  // registry.registerTool({
  //   name: 'exampleTool',
  //   description: 'An example tool',
  //   execute: async () => ({ result: 'example' })
  // });
};
