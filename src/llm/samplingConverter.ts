import { PromptMessageMultipart, Role, TextContent, ImageContent } from '../core/prompt';

export interface SamplingMessage {
  role: string;
  content: TextContent | ImageContent;
}

export interface CreateMessageRequestParams {
  messages: SamplingMessage[];
  maxTokens: number;
  systemPrompt?: string;
  temperature?: number;
  stopSequences?: string[];
  includeContext?: string;
  modelPreferences?: any;
}

export interface CreateMessageResult {
  role: string;
  content: TextContent;
  model: string;
  stopReason?: string;
}

export interface LLMRequestParams {
  maxTokens: number;
  systemPrompt?: string;
  temperature?: number;
  stopSequences?: string[];
  modelPreferences?: any;
}

export class SamplingConverter {
  /** Convert a single SamplingMessage to a PromptMessageMultipart */
  static samplingMessageToPromptMessage(message: SamplingMessage): PromptMessageMultipart {
    const content: Array<TextContent | ImageContent> = [];
    if (message.content.type === 'text') {
      content.push({ type: 'text', text: message.content.text });
    } else if (message.content.type === 'image') {
      content.push({
        type: 'image',
        data: message.content.data,
        mimeType: message.content.mimeType,
      });
    }
    return { role: message.role as Role, content };
  }

  /** Convert a list of SamplingMessages to PromptMessageMultipart objects */
  static convertMessages(messages: SamplingMessage[]): PromptMessageMultipart[] {
    return messages.map((m) => this.samplingMessageToPromptMessage(m));
  }

  /** Extract generic request parameters for LLM calls */
  static extractRequestParams(params: CreateMessageRequestParams): LLMRequestParams {
    return {
      maxTokens: params.maxTokens,
      systemPrompt: params.systemPrompt,
      temperature: params.temperature,
      stopSequences: params.stopSequences,
      modelPreferences: params.modelPreferences,
    };
  }

  /** Helper to construct an error result */
  static errorResult(error_message: string, model: string = 'unknown'): CreateMessageResult {
    return {
      role: 'assistant',
      content: { type: 'text', text: `Error in sampling: ${error_message}` },
      model,
      stopReason: 'error',
    };
  }
}
