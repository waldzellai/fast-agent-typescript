import { Provider } from './providerTypes';

/**
 * Simple runtime key manager that retrieves API keys from the environment
 * and allows manual overrides.
 */
export class KeyManager {
  private static keys: Partial<Record<Provider, string>> = {};

  /** Retrieve a key for a provider, reading from the environment on first use */
  static getKey(provider: Provider): string | undefined {
    if (this.keys[provider]) {
      return this.keys[provider];
    }

    const envVar = this.envVarForProvider(provider);
    const value = envVar ? process.env[envVar] : undefined;
    if (value) {
      this.keys[provider] = value;
    }
    return value;
  }

  /** Manually set a key for a provider */
  static setKey(provider: Provider, key: string): void {
    this.keys[provider] = key;
  }

  private static envVarForProvider(provider: Provider): string | undefined {
    switch (provider) {
      case Provider.OPENAI:
        return 'OPENAI_API_KEY';
      case Provider.ANTHROPIC:
        return 'ANTHROPIC_API_KEY';
      default:
        return undefined;
    }
  }
}
