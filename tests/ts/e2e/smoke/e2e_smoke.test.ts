import { FastAgent } from '../../../../src/fastAgent'; // Adjust import path
import { Prompt } from '../../../../src/core/prompt'; // Adjust import path
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

let fastAgent: FastAgent;

// Determine the directory for the config file relative to the test file
const configDir = path.resolve(__dirname, '../../e2e/smoke'); // Points to the original Python test directory

beforeAll(() => {
  // Initialize FastAgent, assuming config is in the Python test directory
  fastAgent = new FastAgent('smoke-e2e-test-agent');
  // fastAgent.config.baseDir = configDir; // Set baseDir if needed
});

afterAll(() => {
  // Clean up created file if it exists
  const filePath = path.join(configDir, 'weather_location.txt');
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
});

// --- Basic Text Prompting ---
const basicTextModels = [
  'gpt-4.1',
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'gpt-4o-mini',
  'haiku35',
  'deepseek',
  'generic.llama3.2:latest',
  'openrouter.google/gemini-2.0-flash-001',
  'google.gemini-2.0-flash',
];

describe.each(basicTextModels)(
  'Basic Text Prompting (Model: %s)',
  (modelName) => {
    test('should generate a short story about cats', async () => {
      await fastAgent.agent(
        {
          name: 'agent',
          instruction: 'You are a helpful AI Agent',
          model: modelName,
        },
        async (agent) => {
          // Pass the prompt content directly as a string to agent.send
          const response = await agent.send('write a 50 word story about cats');
          const responseText = response.trim();
          const words = responseText.split(/\s+/); // Split by whitespace
          const wordCount = words.length;
          expect(wordCount).toBeGreaterThanOrEqual(40);
          expect(wordCount).toBeLessThanOrEqual(60);
        }
      );
    }, 60000); // Increased timeout
  }
);

// --- Multiple Text Blocks Prompting ---
const multiTextBlockModels = [
  'gpt-4o-mini',
  'haiku35',
  'deepseek',
  'openrouter.google/gemini-2.0-flash-001',
];

describe.each(multiTextBlockModels)(
  'Multiple Text Blocks Prompting (Model: %s)',
  (modelName) => {
    test('should handle multiple user text blocks', async () => {
      await fastAgent.agent(
        {
          name: 'agent',
          instruction: 'You are a helpful AI Agent',
          model: modelName,
        },
        async (agent) => {
          // Test case 1: Call generate directly on agent
          let response = await agent.generate([
            Prompt.user(
              'write a 50 word story',
              "about cats - including the word 'cat'"
            ),
          ]);
          // Assuming generate returns a PromptMessageMultipart-like object with allText()
          let responseText = response.allText().trim();
          let words = responseText.split(/\s+/);
          let wordCount = words.length;
          expect(wordCount).toBeGreaterThanOrEqual(40);
          expect(wordCount).toBeLessThanOrEqual(60);
          expect(responseText.toLowerCase()).toContain('cat');

          // Test case 2: Multiple user prompts, call generate directly on agent
          response = await agent.generate([
            Prompt.user('write a 50 word story'),
            Prompt.user("about cats - including the word 'cat'"),
          ]);
          // Assuming generate returns a PromptMessageMultipart-like object with allText()
          responseText = response.allText().trim();
          words = responseText.split(/\s+/);
          wordCount = words.length;
          expect(wordCount).toBeGreaterThanOrEqual(40);
          expect(wordCount).toBeLessThanOrEqual(60);
          expect(responseText.toLowerCase()).toContain('cat');
        }
      );
    }, 60000); // Increased timeout
  }
);

// --- Structured Output ---
const WeatherConditionSchema = z.enum([
  'sunny',
  'cloudy',
  'rainy',
  'snowy',
  'stormy',
]);
type WeatherCondition = z.infer<typeof WeatherConditionSchema>;

const TemperatureUnitSchema = z.enum(['celsius', 'fahrenheit']);
type TemperatureUnit = z.infer<typeof TemperatureUnitSchema>;

const DailyForecastSchema = z.object({
  day: z.string().describe('Day of the week'),
  condition: WeatherConditionSchema.describe('Weather condition'),
  temperature_high: z.number().describe('Highest temperature for the day'),
  temperature_low: z.number().describe('Lowest temperature for the day'),
  precipitation_chance: z
    .number()
    .min(0)
    .max(100)
    .describe('Chance of precipitation (0-100%)'),
  notes: z.string().describe('Additional forecast notes'),
});
type DailyForecast = z.infer<typeof DailyForecastSchema>;

const WeatherForecastSchema = z.object({
  location: z.string().describe('City and country'),
  unit: TemperatureUnitSchema.describe('Temperature unit'),
  forecast: z
    .array(DailyForecastSchema)
    .length(5)
    .describe('Daily forecasts for 5 days'),
  summary: z.string().describe('Brief summary of the overall forecast'),
});
type WeatherForecast = z.infer<typeof WeatherForecastSchema>;

const structuredModels = [
  'gpt-4o',
  'o3-mini.low',
  'gpt-4.1',
  'gpt-4.1-nano',
  'gpt-4.1-mini',
];

describe.each(structuredModels)(
  'Structured Output (Model: %s)',
  (modelName) => {
    test('should generate structured weather forecast', async () => {
      await fastAgent.agent(
        {
          name: 'weatherforecast',
          instruction:
            'You are a helpful assistant that provides synthesized weather data for testing purposes.',
          model: modelName,
        },
        async (agent) => {
          const promptText = `
        Generate a 5-day weather forecast for San Francisco, California.
        The forecast should include:
        - Daily high and low temperatures in celsius
        - Weather conditions (sunny, cloudy, rainy, snowy, or stormy)
        - Precipitation chance
        - Any special notes about the weather for each day
        Provide a brief summary of the overall forecast period at the end.
      // Call structured directly on the agent object
      const [forecast, result] = await agent.structured(
        [Prompt.user(promptText)],
        WeatherForecastSchema // Pass the Zod schema
      );

          expect(forecast).toBeDefined();
          expect(forecast).not.toBeNull();

          // Zod parsing happens internally in structured, so forecast is already validated if not null
          if (forecast) {
            expect(forecast.location.toLowerCase()).toContain('san francisco');
            expect(forecast.unit).toBe('celsius');
            expect(forecast.forecast).toHaveLength(5);

            forecast.forecast.forEach((day) => {
              expect(day.precipitation_chance).toBeGreaterThanOrEqual(0);
              expect(day.precipitation_chance).toBeLessThanOrEqual(100);
              expect(day.temperature_low).toBeGreaterThanOrEqual(-50);
              expect(day.temperature_low).toBeLessThanOrEqual(60);
              expect(day.temperature_high).toBeGreaterThanOrEqual(-30);
              expect(day.temperature_high).toBeLessThanOrEqual(70);
              expect(day.temperature_high).toBeGreaterThanOrEqual(
                day.temperature_low
              );
            });
            console.log(
              `Weather forecast for ${forecast.location}: ${forecast.summary}`
            );
          }

          // Check raw response contains expected structure hints
          expect(result?.firstText()).toContain('"location":');
        }
      );
    }, 90000); // Longer timeout for structured generation
  }
);

// --- Generic Model Text Prompting ---
const genericModels = ['generic.llama3.2:latest'];

describe.each(genericModels)(
  'Generic Model Text Prompting (Model: %s)',
  (modelName) => {
    test('should generate a short story about cats', async () => {
      await fastAgent.agent(
        {
          name: 'agent',
          instruction: 'You are a helpful AI Agent',
          model: modelName,
        },
        async (agent) => {
          // Pass the prompt content directly as a string to agent.send
          const response = await agent.send('write a 50 word story about cats');
          const responseText = response.trim();
          const words = responseText.split(/\s+/);
          const wordCount = words.length;
          expect(wordCount).toBeGreaterThanOrEqual(40);
          expect(wordCount).toBeLessThanOrEqual(60);
        }
      );
    }, 60000);
  }
);

// --- Basic Tool Calling ---
const toolCallingModels = [
  'deepseek',
  'haiku35',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'google.gemini-2.0-flash',
  'openrouter.google/gemini-2.0-flash-001',
];

describe.each(toolCallingModels)(
  'Basic Tool Calling (Model: %s)',
  (modelName) => {
    test('should call weather tool and create file', async () => {
      const weatherLocationFile = path.join(configDir, 'weather_location.txt'); // Use configDir

      // Ensure file does not exist before test
      if (fs.existsSync(weatherLocationFile)) {
        fs.unlinkSync(weatherLocationFile);
      }
      expect(fs.existsSync(weatherLocationFile)).toBe(false);

      await fastAgent.agent(
        {
          name: 'weatherforecast',
          instruction:
            'You are a helpful assistant that provides synthesized weather data for testing purposes.',
          model: modelName,
          servers: ['test_server'], // Ensure test_server is configured
        },
        async (agent) => {
          // This assumes the 'test_server' provides a tool that creates 'weather_location.txt'
          // when asked about weather in London.
          // Pass the prompt content directly as a string to agent.send
          const response = await agent.send('what is the weather in london');
          expect(response.toLowerCase()).toContain('sunny'); // Assuming tool returns 'sunny'
        }
      );

      // Check file exists after the agent run
      expect(fs.existsSync(weatherLocationFile)).toBe(true);

      // Clean up
      if (fs.existsSync(weatherLocationFile)) {
        fs.unlinkSync(weatherLocationFile);
      }
    }, 60000); // Timeout for potential tool execution
  }
);

// --- Tool Calls with No Args ---
const noArgsToolModels = [
  'deepseek',
  'haiku35',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4.1-nano',
  'gpt-4.1-mini',
  'google.gemini-2.0-flash',
  'openrouter.anthropic/claude-3.7-sonnet',
];

describe.each(noArgsToolModels)(
  'Tool Calls with No Args (Model: %s)',
  (modelName) => {
    test('should call shirt color tool', async () => {
      await fastAgent.agent(
        {
          name: 'shirt_colour',
          instruction:
            'You are a helpful assistant that provides information on shirt colours.',
          model: modelName,
          servers: ['test_server'], // Ensure test_server provides 'get_shirt_colour' tool
        },
        async (agent) => {
          // Pass the prompt content directly as a string to agent.send
          const response = await agent.send('get the shirt colour');
          expect(response.toLowerCase()).toContain('blue'); // Assuming tool returns 'blue'
        }
      );
    }, 60000);
  }
);

// --- Server Name with Hyphen ---
const hyphenServerModels = [
  'deepseek',
  'haiku35',
  'gpt-4.1',
  'google.gemini-2.0-flash',
];

describe.each(hyphenServerModels)(
  'Server Name with Hyphen (Model: %s)',
  (modelName) => {
    test('should call tool via server with hyphen in name', async () => {
      await fastAgent.agent(
        {
          name: 'shirt_colour', // Agent name can be anything
          instruction:
            'You are a helpful assistant that provides information on shirt colours.',
          model: modelName,
          servers: ['hyphen-name'], // Ensure hyphen-name server is configured
        },
        async (agent) => {
          // Assuming 'hyphen-name' server provides a weather tool similar to 'test_server'
          const response = await agent.send('check the weather in new york');
          expect(response.toLowerCase()).toContain('sunny'); // Assuming tool returns 'sunny'
        }
      );
    }, 60000);
  }
);
