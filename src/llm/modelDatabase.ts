import { Provider, ReasoningEffort, ModelConfig } from './providerTypes';

/**
 * Minimal model database mapping common model names to providers.
 * This mirrors the functionality of the Python implementation but keeps
 * the data intentionally small.
 */
const MODEL_DATABASE: Record<string, ModelConfig> = {
  'gpt-4.1': { provider: Provider.OPENAI, modelName: 'gpt-4.1' },
  'o1': { provider: Provider.OPENAI, modelName: 'o1' },
  'o1-mini': { provider: Provider.OPENAI, modelName: 'o1-mini' },
  'claude-3-haiku-20240307': {
    provider: Provider.ANTHROPIC,
    modelName: 'claude-3-haiku-20240307',
  },
  'claude-3-5-sonnet-20240620': {
    provider: Provider.ANTHROPIC,
    modelName: 'claude-3-5-sonnet-20240620',
  },
};

/** Lookup basic configuration information for a model */
export class ModelDatabase {
  static get(model: string): ModelConfig | undefined {
    return MODEL_DATABASE[model];
  }

  /**
   * Parse a model string of the form "provider.model[.effort]" and return
   * a ModelConfig. If provider is omitted we try to infer it from the database.
   */
  static parseModelString(model: string): ModelConfig | undefined {
    const direct = this.get(model);
    if (direct) {
      return direct;
    }

    const parts = model.split('.');
    if (parts.length >= 2) {
      const providerStr = parts[0];
      const modelName = parts[1];
      const effortStr = parts[2];
      const provider = (Provider as any)[providerStr.toUpperCase()];
      if (!provider) {
        return undefined;
      }
      const reasoningEffort = effortStr
        ? (ReasoningEffort as any)[effortStr.toUpperCase()]
        : undefined;
      return {
        provider,
        modelName,
        reasoningEffort,
      } as ModelConfig;
    }
    return undefined;
  }
}
