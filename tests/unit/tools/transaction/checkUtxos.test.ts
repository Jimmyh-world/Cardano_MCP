import { CheckUtxos } from '../../../../src/tools/transaction/checkUtxos';
import { TransactionData } from '../../../../src/tools/types';

describe('CheckUtxos', () => {
  let checker: CheckUtxos;

  beforeEach(() => {
    checker = new CheckUtxos({
      timeout_ms: 5000,
    });
  });

  describe('validate', () => {
    it('should validate correct transaction input', async () => {
      const input = {
        transaction: {
          inputs: [
            {
              txHash: 'abc123',
              index: 0,
              amount: BigInt(5000000),
              address: 'addr1...',
            },
          ],
          outputs: [
            {
              address: 'addr2...',
              amount: BigInt(4000000),
            },
          ],
          fee: BigInt(1000000),
        },
      };

      const isValid = await checker.validate(input);
      expect(isValid).toBe(true);
    });

    it('should reject missing transaction', async () => {
      const input = {} as any;

      const isValid = await checker.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject invalid input/output arrays', async () => {
      const input = {
        transaction: {
          inputs: 'not an array',
          outputs: [{ address: 'addr1...', amount: BigInt(1000000) }],
          fee: BigInt(1000000),
        },
      } as any;

      const isValid = await checker.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject invalid fee type', async () => {
      const input = {
        transaction: {
          inputs: [{ txHash: 'abc', index: 0, amount: BigInt(2000000), address: 'addr1...' }],
          outputs: [{ address: 'addr2...', amount: BigInt(1000000) }],
          fee: 1000000, // Number instead of BigInt
        },
      } as any;

      const isValid = await checker.validate(input);
      expect(isValid).toBe(false);
    });
  });

  describe('execute', () => {
    it('should validate a balanced transaction', async () => {
      const input = {
        transaction: {
          inputs: [
            {
              txHash: 'abc123',
              index: 0,
              amount: BigInt(5000000),
              address: 'addr1...',
            },
          ],
          outputs: [
            {
              address: 'addr2...',
              amount: BigInt(4000000),
            },
          ],
          fee: BigInt(1000000),
        },
        params: {
          network: 'testnet' as const,
          minUtxoValue: BigInt(1000000),
        },
      };

      const result = await checker.execute(input);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.balanceCheck.isBalanced).toBe(true);
      expect(result.data.utxoChecks.minUtxoValueRespected).toBe(true);
      expect(result.data.utxoChecks.noDoubleSpending).toBe(true);
      expect(result.metrics?.execution_time_ms).toBeGreaterThan(0);
    });

    it('should detect unbalanced transaction', async () => {
      const input = {
        transaction: {
          inputs: [
            {
              txHash: 'abc123',
              index: 0,
              amount: BigInt(5000000),
              address: 'addr1...',
            },
          ],
          outputs: [
            {
              address: 'addr2...',
              amount: BigInt(4500000),
            },
          ],
          fee: BigInt(1000000), // Total: 5.5 ADA needed, only 5 ADA input
        },
        params: {
          network: 'testnet' as const,
        },
      };

      const result = await checker.execute(input);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.balanceCheck.isBalanced).toBe(false);
    });

    it('should detect UTxO below minimum value', async () => {
      const input = {
        transaction: {
          inputs: [
            {
              txHash: 'abc123',
              index: 0,
              amount: BigInt(2000000),
              address: 'addr1...',
            },
          ],
          outputs: [
            {
              address: 'addr2...',
              amount: BigInt(500000), // Below minimum UTxO value
            },
          ],
          fee: BigInt(1500000),
        },
        params: {
          network: 'testnet' as const,
          minUtxoValue: BigInt(1000000),
        },
      };

      const result = await checker.execute(input);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.utxoChecks.minUtxoValueRespected).toBe(false);
    });

    it('should detect double spending', async () => {
      const input = {
        transaction: {
          inputs: [
            {
              txHash: 'abc123',
              index: 0,
              amount: BigInt(2000000),
              address: 'addr1...',
            },
            {
              txHash: 'abc123',
              index: 0, // Same input used twice
              amount: BigInt(2000000),
              address: 'addr1...',
            },
          ],
          outputs: [
            {
              address: 'addr2...',
              amount: BigInt(3000000),
            },
          ],
          fee: BigInt(1000000),
        },
        params: {
          network: 'testnet' as const,
        },
      };

      const result = await checker.execute(input);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.utxoChecks.noDoubleSpending).toBe(false);
    });

    it('should warn about large transaction size', async () => {
      const input = {
        transaction: {
          inputs: Array(100).fill({
            txHash: 'abc123',
            index: 0,
            amount: BigInt(1000000),
            address: 'addr1...',
          }),
          outputs: Array(100).fill({
            address: 'addr2...',
            amount: BigInt(900000),
          }),
          fee: BigInt(10000000),
        },
        params: {
          network: 'testnet' as const,
          maxTxSize: 16384,
        },
      };

      const result = await checker.execute(input);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Transaction size is approaching the limit');
    });
  });
});
