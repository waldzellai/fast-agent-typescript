import { metrics } from '@opentelemetry/api';
import { getLogger } from '../mcp_agent_ts/logging/logger';

const meter = metrics.getMeter('fast-agent');
const inputCounter = meter.createCounter('llm_input_tokens', {
  description: 'Number of input tokens sent to the LLM',
});
const outputCounter = meter.createCounter('llm_output_tokens', {
  description: 'Number of output tokens produced by the LLM',
});

const usageLogger = getLogger('llm.usage');

export interface UsageMetrics {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Record usage metrics for an LLM interaction. The metrics are sent to
 * OpenTelemetry and also emitted as a structured event log.
 */
export function trackUsage({
  model,
  inputTokens,
  outputTokens,
}: UsageMetrics): void {
  if (inputTokens) {
    inputCounter.add(inputTokens, { model });
  }
  if (outputTokens) {
    outputCounter.add(outputTokens, { model });
  }
  usageLogger.event?.('llm_usage', { model, inputTokens, outputTokens });
}
