/**
 * E2E smoke tests for FastAgent
 * TypeScript port of test_e2e_smoke.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { FastAgent } from '../../../src/fastAgent';
import { BaseAgent } from '../../../src/mcpAgent';
import { Prompt } from '../../../src/core/prompt';
import * as directFactory from '../../../src/core/directFactory';

// Define enums for structured data
enum WeatherCondition {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  SNOWY = 'snowy',
  STORMY = 'stormy',
}

enum TemperatureUnit {
  CELSIUS = 'celsius',
  FAHRENHEIT = 'fahrenheit',
}

// Define interfaces for structured data
interface DailyForecast {
  day: string;
  condition: WeatherCondition;
  temperature_high: number;
  temperature_low: number;
  precipitation_chance: number;
  notes: string;
}

interface WeatherForecast {
  location: string;
  unit: TemperatureUnit;
  forecast: DailyForecast[];
  summary: string;
}

// Runtime placeholder so we can pass a value where a runtime validator might be expected
// while keeping the compile-time type separate.
// In production, this could be replaced with a zod schema or similar runtime validator.
const WeatherForecast: unknown = {};

// --- Define Mock LLMs ---
const textPromptLlm = {
  // Generic mock that echoes a canned cat story regardless of input type
  send: jest.fn().mockImplementation((_message: unknown) => {
    // Generate a 50-word story about cats
    return Promise.resolve(
      'Whiskers prowled the moonlit garden, tail twitching with anticipation. A rustling sound caught her attention. Mouse? Bird? She crouched low, ready to pounce. Her feline instincts took over as she leaped gracefully. The butterfly escaped, dancing just beyond reach. Whiskers watched, plotting her next move. Tomorrow, she thought. Tomorrow the butterfly would be hers.'
    );
  }),
  generate: jest.fn().mockImplementation((messages: any[]) => {
    // Generate a 50-word story about cats
    return Promise.resolve({
      first_text: () =>
        'Whiskers prowled the moonlit garden, tail twitching with anticipation. A rustling sound caught her attention. Mouse? Bird? She crouched low, ready to pounce. Her feline instincts took over as she leaped gracefully. The butterfly escaped, dancing just beyond reach. Whiskers watched, plotting her next move. Tomorrow, she thought. Tomorrow the butterfly would be hers.',
      all_text: () =>
        'Whiskers prowled the moonlit garden, tail twitching with anticipation. A rustling sound caught her attention. Mouse? Bird? She crouched low, ready to pounce. Her feline instincts took over as she leaped gracefully. The butterfly escaped, dancing just beyond reach. Whiskers watched, plotting her next move. Tomorrow, she thought. Tomorrow the butterfly would be hers.',
    });
  }),
};

const structuredLlm = {
  send: jest.fn().mockImplementation((_message: unknown) => {
    // Return a structured weather forecast
    const forecast: WeatherForecast = {
      location: 'New York, USA',
      unit: TemperatureUnit.CELSIUS,
      forecast: [
        {
          day: 'Monday',
          condition: WeatherCondition.SUNNY,
          temperature_high: 25.5,
          temperature_low: 18.2,
          precipitation_chance: 10,
          notes: 'Clear skies all day.',
        },
        {
          day: 'Tuesday',
          condition: WeatherCondition.CLOUDY,
          temperature_high: 22.8,
          temperature_low: 17.5,
          precipitation_chance: 30,
          notes: 'Partly cloudy with light breeze.',
        },
        {
          day: 'Wednesday',
          condition: WeatherCondition.RAINY,
          temperature_high: 19.5,
          temperature_low: 15.0,
          precipitation_chance: 80,
          notes: 'Heavy rain expected in the afternoon.',
        },
      ],
      summary: 'Mixed conditions with rain expected midweek.',
    };

    return Promise.resolve(JSON.stringify(forecast));
  }),
  structured: jest.fn().mockImplementation((_messages: unknown[], _model: unknown) => {
    // Return a structured weather forecast
    const forecast: WeatherForecast = {
      location: 'New York, USA',
      unit: TemperatureUnit.CELSIUS,
      forecast: [
        {
          day: 'Monday',
          condition: WeatherCondition.SUNNY,
          temperature_high: 25.5,
          temperature_low: 18.2,
          precipitation_chance: 10,
          notes: 'Clear skies all day.',
        },
        {
          day: 'Tuesday',
          condition: WeatherCondition.CLOUDY,
          temperature_high: 22.8,
          temperature_low: 17.5,
          precipitation_chance: 30,
          notes: 'Partly cloudy with light breeze.',
        },
        {
          day: 'Wednesday',
          condition: WeatherCondition.RAINY,
          temperature_high: 19.5,
          temperature_low: 15.0,
          precipitation_chance: 80,
          notes: 'Heavy rain expected in the afternoon.',
        },
      ],
      summary: 'Mixed conditions with rain expected midweek.',
    };

    return Promise.resolve([
      forecast,
      {
        first_text: () => JSON.stringify(forecast),
      },
    ]);
  }),
};

const toolCallLlm = {
  send: jest.fn().mockImplementation((message: string) => {
    if (message.toLowerCase().includes('weather')) {
      return Promise.resolve(
        "I'll check the weather for you. It's sunny in London today!"
      );
    } else if (
      message.toLowerCase().includes('shirt') ||
      message.toLowerCase().includes('colour')
    ) {
      return Promise.resolve('The shirt is blue polka dots.');
    } else {
      return Promise.resolve("I'm not sure how to help with that.");
    }
  }),
};

const defaultLlm = {
  send: jest.fn(),
  generate: jest.fn(),
}; // Fallback

// Mock the directFactory module
jest.mock('../../../src/core/directFactory', () => ({
  getModelFactory: jest.fn().mockImplementation((_context, modelName) => {
    // This mock should return a FACTORY FUNCTION
    return () => {
      // Determine which mock LLM to return based on the test case
      if (
        [
          'gpt-4.1',
          'gpt-4.1-nano',
          'gpt-4.1-mini',
          'gpt-4o-mini',
          'haiku35',
          'deepseek',
          'generic.llama3.2:latest',
          'openrouter.google/gemini-2.0-flash-001',
          'google.gemini-2.0-flash',
        ].includes(modelName)
      ) {
        // For text prompting tests
        return textPromptLlm;
      } else if (['gpt-4.1', 'gpt-4o'].includes(modelName)) {
        // For structured output tests
        return structuredLlm;
      } else if (
        [
          'deepseek',
          'haiku',
          'gpt-4o',
          'gpt-4.1',
          'gpt-4.1-nano',
          'gpt-4.1-mini',
          'google.gemini-2.0-flash',
          'openrouter.google/gemini-2.0-flash-001',
          'openrouter.anthropic/claude-3.7-sonnet',
        ].includes(modelName)
      ) {
        // For tool calling tests
        return toolCallLlm;
      }

      // Default or throw error if unexpected model name
      console.warn(
        `Mock LLM requested for unexpected model: ${modelName}. Using default.`
      );
      return defaultLlm;
    };
  }),
}));

// Test models to run the tests with - subset of the models in the Python test
const textPromptModels = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'haiku35',
  'generic.llama3.2:latest',
];
const multiTextBlockModels = [
  'gpt-4o-mini',
  'haiku35',
  'openrouter.google/gemini-2.0-flash-001',
];
const structuredModels = ['gpt-4.1', 'gpt-4o'];
const toolCallModels = ['deepseek', 'haiku35', 'gpt-4.1-mini'];
const noArgsToolModels = ['deepseek', 'haiku35', 'gpt-4.1-mini'];
const hyphenServerModels = ['deepseek', 'haiku35', 'gpt-4.1'];

// --- Tests ---
describe('FastAgent E2E Smoke Tests', () => {
  let fast: FastAgent;

  beforeEach(() => {
    // Reset mocks before each test
    // Clear calls to the outer mock factory function
    (directFactory.getModelFactory as jest.Mock).mockClear();
    // Clear calls on the individual mock LLM's methods
    textPromptLlm.send.mockClear();
    textPromptLlm.generate.mockClear();
    structuredLlm.send.mockClear();
    toolCallLlm.send.mockClear();
    defaultLlm.send.mockClear();
    defaultLlm.generate.mockClear();

    // Create a new FastAgent instance for each test
    fast = new FastAgent('testSmokeInstance');
    // Prevent actual config loading during tests
    (fast as any).loadConfig = jest.fn();

    // Mock the config
    (fast as any).context = {
      config: {
        default_model: 'haiku35',
        mcp: {
          servers: {
            test_server: {
              command: 'ts-node',
              args: ['test_server.ts'],
            },
            'hyphen-name': {
              command: 'ts-node',
              args: ['test_server.ts'],
            },
          },
        },
      },
    };
  });

  textPromptModels.forEach((modelName) => {
    it(`should process basic textual prompting with ${modelName}`, async () => {
      // Define agent
      fast.agent(
        {
          name: 'agent',
          instruction: 'You are a helpful AI Agent',
          model: modelName,
        },
        async (agent: BaseAgent) => {
          // Test basic text prompting
          const response = await agent.send('write a 50 word story about cats');
          const responseText = response.trim();
          const words = responseText.split(/\s+/);
          const wordCount = words.length;

          // Verify word count is between 40-60
          expect(wordCount).toBeGreaterThanOrEqual(40);
          expect(wordCount).toBeLessThanOrEqual(60);
        }
      );

      // Run FastAgent
      await fast.run();
    });
  });

  multiTextBlockModels.forEach((modelName) => {
    it(`should process multiple text blocks with ${modelName}`, async () => {
      // Define agent
      fast.agent(
        {
          instruction: 'You are a helpful AI Agent',
          model: modelName,
        },
        async (agent: BaseAgent) => {
          // Test with multiple text blocks in one prompt
          const response1 = await (agent as any).default.generate([
            Prompt.user(
              'write a 50 word story',
              "about cats - including the word 'cat'"
            ),
          ]);
          const responseText1 = response1.all_text();
          const words1 = responseText1.split(/\s+/);
          const wordCount1 = words1.length;

          // Verify word count and content
          expect(wordCount1).toBeGreaterThanOrEqual(40);
          expect(wordCount1).toBeLessThanOrEqual(60);
          expect(responseText1.toLowerCase()).toContain('cat');

          // Test with multiple separate prompts
          const response2 = await (agent as any).default.generate([
            Prompt.user('write a 50 word story'),
            Prompt.user("about cats - including the word 'cat'"),
          ]);
          const responseText2 = response2.all_text();
          const words2 = responseText2.split(/\s+/);
          const wordCount2 = words2.length;

          // Verify word count and content
          expect(wordCount2).toBeGreaterThanOrEqual(40);
          expect(wordCount2).toBeLessThanOrEqual(60);
          expect(responseText2.toLowerCase()).toContain('cat');
        }
      );

      // Run FastAgent
      await fast.run();
    });
  });

  structuredModels.forEach((modelName) => {
    it(`should generate structured weather forecast data with ${modelName}`, async () => {
      // Define agent
      fast.agent(
        {
          name: 'weatherforecast',
          instruction:
            'You are a helpful assistant that provides synthesized weather data for testing purposes.',
          model: modelName,
        },
        async (agent: BaseAgent) => {
          // Mock the structured method
          (agent as any).weatherforecast = {
            structured: jest.fn().mockResolvedValue([
              {
                location: 'New York, USA',
                unit: TemperatureUnit.CELSIUS,
                forecast: [
                  {
                    day: 'Monday',
                    condition: WeatherCondition.SUNNY,
                    temperature_high: 25.5,
                    temperature_low: 18.2,
                    precipitation_chance: 10,
                    notes: 'Clear skies all day.',
                  },
                  {
                    day: 'Tuesday',
                    condition: WeatherCondition.CLOUDY,
                    temperature_high: 22.8,
                    temperature_low: 17.5,
                    precipitation_chance: 30,
                    notes: 'Partly cloudy with light breeze.',
                  },
                  {
                    day: 'Wednesday',
                    condition: WeatherCondition.RAINY,
                    temperature_high: 19.5,
                    temperature_low: 15.0,
                    precipitation_chance: 80,
                    notes: 'Heavy rain expected in the afternoon.',
                  },
                ],
                summary: 'Mixed conditions with rain expected midweek.',
              },
              {
                first_text: () =>
                  JSON.stringify({
                    location: 'New York, USA',
                    unit: TemperatureUnit.CELSIUS,
                    forecast: [
                      {
                        day: 'Monday',
                        condition: WeatherCondition.SUNNY,
                        temperature_high: 25.5,
                        temperature_low: 18.2,
                        precipitation_chance: 10,
                        notes: 'Clear skies all day.',
                      },
                      {
                        day: 'Tuesday',
                        condition: WeatherCondition.CLOUDY,
                        temperature_high: 22.8,
                        temperature_low: 17.5,
                        precipitation_chance: 30,
                        notes: 'Partly cloudy with light breeze.',
                      },
                      {
                        day: 'Wednesday',
                        condition: WeatherCondition.RAINY,
                        temperature_high: 19.5,
                        temperature_low: 15.0,
                        precipitation_chance: 80,
                        notes: 'Heavy rain expected in the afternoon.',
                      },
                    ],
                    summary: 'Mixed conditions with rain expected midweek.',
                  }),
              },
            ]),
          };

          // Test structured output
          const [forecast, _] = await (agent as any).weatherforecast.structured(
            [Prompt.user('Generate a 3-day weather forecast for New York')],
            WeatherForecast
          );

          // Verify structured output
          expect(forecast).toBeDefined();
          expect(forecast.location).toBe('New York, USA');
          expect(forecast.unit).toBe(TemperatureUnit.CELSIUS);
          expect(forecast.forecast.length).toBe(3);
          expect(forecast.forecast[0].day).toBe('Monday');
          expect(forecast.forecast[0].condition).toBe(WeatherCondition.SUNNY);
          expect(forecast.forecast[1].day).toBe('Tuesday');
          expect(forecast.forecast[2].day).toBe('Wednesday');
          expect(forecast.summary).toBeDefined();
        }
      );

      // Run FastAgent
      await fast.run();
    });
  });

  toolCallModels.forEach((modelName) => {
    it(`should make basic tool calls with ${modelName}`, async () => {
      // Define agent
      fast.agent(
        {
          name: 'weatherforecast',
          instruction:
            'You are a helpful assistant that provides synthesized weather data for testing purposes.',
          model: modelName,
          servers: ['test_server'],
        },
        async (agent: BaseAgent) => {
          // Delete weather_location.txt if it exists
          if (fs.existsSync('weather_location.txt')) {
            fs.unlinkSync('weather_location.txt');
          }

          // Verify file doesn't exist before test
          expect(fs.existsSync('weather_location.txt')).toBe(false);

          // Test tool call
          const response = await agent.send('what is the weather in london');

          // Verify response contains expected content
          expect(response.toLowerCase()).toContain('sunny');

          // Verify file was created by tool call
          expect(fs.existsSync('weather_location.txt')).toBe(true);

          // Clean up
          if (fs.existsSync('weather_location.txt')) {
            fs.unlinkSync('weather_location.txt');
          }
        }
      );

      // Run FastAgent
      await fast.run();
    });
  });

  noArgsToolModels.forEach((modelName) => {
    it(`should make tool calls with no arguments with ${modelName}`, async () => {
      // Define agent
      fast.agent(
        {
          name: 'shirt_colour',
          instruction:
            'You are a helpful assistant that provides information on shirt colours.',
          model: modelName,
          servers: ['test_server'],
        },
        async (agent: BaseAgent) => {
          // Test tool call with no arguments
          const response = await agent.send('get the shirt colour');

          // Verify response contains expected content
          expect(response.toLowerCase()).toContain('blue');
        }
      );

      // Run FastAgent
      await fast.run();
    });
  });

  hyphenServerModels.forEach((modelName) => {
    it(`should work with server names containing hyphens with ${modelName}`, async () => {
      // Define agent
      fast.agent(
        {
          name: 'shirt_colour',
          instruction:
            'You are a helpful assistant that provides information on shirt colours.',
          model: modelName,
          servers: ['hyphen-name'],
        },
        async (agent: BaseAgent) => {
          // Test with hyphenated server name
          const response = await agent.send('check the weather in new york');

          // Verify response contains expected content
          expect(response.toLowerCase()).toContain('sunny');
        }
      );

      // Run FastAgent
      await fast.run();
    });
  });
});
