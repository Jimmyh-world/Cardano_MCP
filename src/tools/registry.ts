interface Tool {
  name: string;
  description: string;
  execute: (...args: any[]) => Promise<any>;
}

class ToolRegistry {
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

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
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
