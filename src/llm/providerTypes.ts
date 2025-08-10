export enum Provider {
  FAST_AGENT = 'fast_agent',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GENERIC = 'generic',
}

export enum ReasoningEffort {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface ModelConfig {
  provider: Provider;
  modelName: string;
  reasoningEffort?: ReasoningEffort;
}
