import { CardanoPromptSystem } from './implementation';
import { PromptConfig, PromptContext, PromptEvent } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

class TestRunner {
  private promptSystem: CardanoPromptSystem;
  private testResults: { name: string; success: boolean; message: string }[] = [];

  constructor(config: PromptConfig) {
    this.promptSystem = new CardanoPromptSystem(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.promptSystem.onEvent((event: PromptEvent) => {
      console.log(chalk.blue('\nEvent Received:'), chalk.cyan(event.type));
      console.log(chalk.gray(JSON.stringify(event.data, null, 2)));
    });
  }

  async runTests() {
    console.log(chalk.yellow('\n🚀 Starting Cardano MCP Server Connection Tests\n'));

    // Test 1: Configuration Loading
    await this.runTest('Configuration Loading', async () => {
      console.log(chalk.gray('Verifying configuration structure...'));
      this.validateConfig(config);
      return 'Configuration validated successfully';
    });

    // Test 2: Prompt Loading
    await this.runTest('Prompt Loading', async () => {
      console.log(chalk.gray('Attempting to load base prompt...'));
      const prompt = await this.promptSystem.loadPrompt('base');
      if (!prompt) throw new Error('Failed to load base prompt');
      return 'Base prompt loaded successfully';
    });

    // Test 3: Tool Access
    await this.runTest('Tool Access', async () => {
      console.log(chalk.gray('Checking tool availability...'));
      const tools = this.promptSystem.getAvailableTools('smart_contract');
      if (!tools.includes('validatePlutusScript')) {
        throw new Error('Required tool not available');
      }
      return `Found ${tools.length} tools available`;
    });

    // Test 4: Knowledge Base Access
    await this.runTest('Knowledge Base Access', async () => {
      console.log(chalk.gray('Verifying knowledge base configuration...'));
      const kbConfig = this.promptSystem.getKnowledgeBaseConfig('smart_contract');
      if (!kbConfig.categories.includes('smart-contracts')) {
        throw new Error('Required knowledge base category not found');
      }
      return 'Knowledge base configuration verified';
    });

    // Test 5: Security Validation
    await this.runTest('Security Validation', async () => {
      console.log(chalk.gray('Testing security checks...'));
      const isSecure = await this.promptSystem.checkSecurity({
        type: 'test_request',
        timestamp: Date.now(),
      });
      if (!isSecure) throw new Error('Security check failed');
      return 'Security validation passed';
    });

    // Test 6: End-to-End Prompt Execution
    await this.runTest('End-to-End Execution', async () => {
      console.log(chalk.gray('Executing test prompt...'));
      const context: PromptContext = {
        type: 'smart_contract',
        tools: [
          {
            name: 'validatePlutusScript',
            config: config.tool_configurations.validatePlutusScript,
          },
        ],
        knowledge_base: {
          categories: ['smart-contracts', 'security'],
          min_relevance: 0.8,
        },
        security: config.security_settings,
      };

      const result = await this.promptSystem.executePrompt(context);
      if (!result.success) throw new Error('Prompt execution failed');
      return `Prompt executed successfully in ${result.execution_time_ms}ms`;
    });

    // Print Summary
    this.printSummary();
  }

  private async runTest(name: string, testFn: () => Promise<string>) {
    try {
      console.log(chalk.white(`\n📋 Running Test: ${name}`));
      const message = await testFn();
      this.testResults.push({ name, success: true, message });
      console.log(chalk.green(`✅ Success: ${message}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.testResults.push({ name, success: false, message });
      console.log(chalk.red(`❌ Failed: ${message}`));
    }
  }

  private validateConfig(config: PromptConfig) {
    const requiredFields = ['version', 'prompts', 'tool_configurations', 'security_settings'];
    for (const field of requiredFields) {
      if (!config[field as keyof PromptConfig]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  private printSummary() {
    console.log(chalk.yellow('\n📊 Test Summary:\n'));

    const successful = this.testResults.filter((r) => r.success).length;
    const total = this.testResults.length;

    this.testResults.forEach(({ name, success, message }) => {
      const icon = success ? '✅' : '❌';
      const color = success ? chalk.green : chalk.red;
      console.log(color(`${icon} ${name}: ${message}`));
    });

    console.log(chalk.yellow(`\n${successful}/${total} tests passed`));

    if (successful === total) {
      console.log(chalk.green('\n🎉 All systems operational!\n'));
    } else {
      console.log(chalk.red('\n⚠️  Some tests failed. Please check the logs above.\n'));
    }
  }
}

// Load configuration
const config: PromptConfig = require('./config.json');

// Run tests
const testRunner = new TestRunner(config);
testRunner.runTests().catch((error) => {
  console.error(chalk.red('\n❌ Fatal Error:'), error);
  process.exit(1);
});
