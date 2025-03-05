import { ValidatePlutusScript } from '../../../../src/tools/transaction/validatePlutusScript';
import { PlutusScript } from '../../../../src/tools/types';

describe('ValidatePlutusScript', () => {
  let validator: ValidatePlutusScript;

  beforeEach(() => {
    validator = new ValidatePlutusScript({
      timeout_ms: 5000,
      max_script_size_bytes: 1048576,
      supported_frameworks: ['plutus-v2'],
    });
  });

  describe('validate', () => {
    it('should validate correct Plutus script input', async () => {
      const input = {
        script: {
          type: 'plutus_v2' as const,
          code: 'valid plutus code',
        },
      };

      const isValid = await validator.validate(input);
      expect(isValid).toBe(true);
    });

    it('should reject empty script', async () => {
      const input = {
        script: {
          type: 'plutus_v2' as const,
          code: '',
        },
      };

      const isValid = await validator.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject oversized script', async () => {
      const input = {
        script: {
          type: 'plutus_v2' as const,
          code: 'x'.repeat(1048577), // Exceeds max size
        },
      };

      const isValid = await validator.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject invalid script type', async () => {
      const input = {
        script: {
          type: 'invalid_type' as any,
          code: 'valid plutus code',
        },
      };

      const isValid = await validator.validate(input);
      expect(isValid).toBe(false);
    });
  });

  describe('execute', () => {
    it('should successfully validate a correct script', async () => {
      const input = {
        script: {
          type: 'plutus_v2' as const,
          code: 'valid plutus code',
        },
        params: {
          network: 'testnet' as const,
          maxMemoryUnits: 1000000,
          maxCpuUnits: 500000,
        },
      };

      const result = await validator.execute(input);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.resourceEstimates).toBeDefined();
      expect(result.metrics?.execution_time_ms).toBeGreaterThan(0);
    });

    it('should return appropriate warnings for high resource usage', async () => {
      const input = {
        script: {
          type: 'plutus_v2' as const,
          code: 'x'.repeat(100000), // Large script to trigger resource warnings
        },
        params: {
          network: 'testnet' as const,
          maxMemoryUnits: 1000,
          maxCpuUnits: 500,
        },
      };

      const result = await validator.execute(input);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Memory usage is approaching the limit');
      expect(result.warnings).toContain('CPU usage is approaching the limit');
    });

    it('should handle invalid input gracefully', async () => {
      const input = {
        script: {
          type: 'invalid_type' as any,
          code: '',
        },
      };

      const result = await validator.execute(input);

      expect(result.success).toBe(false);
      expect(result.data.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });
});
