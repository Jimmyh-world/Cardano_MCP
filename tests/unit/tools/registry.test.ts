import { ToolRegistry } from '../../../src/tools/registry';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
  });

  describe('tool management', () => {
    it('should register and execute a tool', async () => {
      const mockTool = {
        name: 'testTool',
        description: 'A test tool',
        execute: jest.fn().mockResolvedValue({ result: 'success' }),
      };

      registry.registerTool(mockTool);

      expect(registry.hasTool('testTool')).toBe(true);

      const result = await registry.executeTool('testTool', 'arg1', 'arg2');
      expect(result).toEqual({ result: 'success' });
      expect(mockTool.execute).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should throw error when executing non-existent tool', async () => {
      await expect(registry.executeTool('nonexistentTool')).rejects.toThrow(
        'Tool not found: nonexistentTool',
      );
    });

    it('should maintain singleton instance', () => {
      const instance1 = ToolRegistry.getInstance();
      const instance2 = ToolRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
