import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

export interface OtelOptions {
  serviceName?: string;
  exporterUrl?: string;
}

/**
 * Configure and start OpenTelemetry for the current process.
 *
 * Returns the initialized NodeSDK instance or null if telemetry is disabled.
 */
export function configureOtel(options: OtelOptions = {}): NodeSDK | null {
  if (sdk) {
    return sdk;
  }

  const disabled = process.env.FAST_OTEL_DISABLED === '1';
  if (disabled) {
    return null;
  }

  const serviceName =
    options.serviceName || process.env.FAST_OTEL_SERVICE_NAME || 'fast-agent';

  const exporterUrl =
    options.exporterUrl ||
    process.env.FAST_OTEL_EXPORTER_URL ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  const traceExporter = new OTLPTraceExporter(
    exporterUrl ? { url: exporterUrl } : {}
  );

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
    traceExporter,
  });

  sdk.start();

  process.once('SIGTERM', () => {
    sdk
      ?.shutdown()
      .catch((err) => console.error('OpenTelemetry shutdown error', err));
  });

  return sdk;
}
