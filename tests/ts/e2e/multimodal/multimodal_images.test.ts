import { FastAgent } from '../../../../src/fastAgent';
import { Prompt } from '../../../../src/core/prompt';
import { BaseAgent } from '../../../../src/mcpAgent'; // Import BaseAgent
import path from 'path';

describe('Multimodal Image and PDF Tests', () => {
  // Corresponds to test_agent_with_image_prompt in Python
  test.each(['gpt-4.1-mini', 'sonnet'])(
    'should process an image prompt with model %s',
    async (modelName) => {
      const fast = new FastAgent('multimodal-tests');

      const agentFunction = async (agent: BaseAgent) => {
        const prompt = Prompt.user(
          'what is the user name contained in this image?',
          path.join(__dirname, 'image.png')
        );
        const response = await agent.send(prompt as any); // Cast to any

        expect(response).toContain('evalstate');
      };

      fast.agent(
        {
          name: 'agent',
          instruction: 'You are a helpful AI Agent',
          model: modelName,
        },
        agentFunction
      );

      await fast.run();
    }
  );
});
