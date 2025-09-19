import { Data, Effect, Option } from 'effect';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import yaml from 'js-yaml';
import type { Context } from '../../mcpAgent';

type UnknownRecord = Record<string, unknown>;

class ReadFileError extends Data.TaggedError('ReadFileError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

class ParseYamlError extends Data.TaggedError('ParseYamlError')<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export type ConfigLoaderError = ReadFileError | ParseYamlError;

export interface LoadAgentConfigurationOptions {
  readonly cwd?: string;
  readonly baseContext?: Context;
}

export interface LoadAgentConfigurationSuccess {
  readonly context: Context;
  readonly messages: ReadonlyArray<string>;
}

const DEFAULT_CONTEXT: Context = { config: { mcp: { servers: {} } } };

const CONFIG_FILE_NAME = 'fastagent.config.yaml';
const SECRETS_FILE_NAME = 'fastagent.secrets.yaml';

export const loadAgentConfiguration = (
  options: LoadAgentConfigurationOptions = {}
): Effect.Effect<LoadAgentConfigurationSuccess, ConfigLoaderError> =>
  Effect.gen(function* () {
    const cwd = options.cwd ?? process.cwd();
    const baseContext = options.baseContext ?? DEFAULT_CONTEXT;

    const configPath = path.resolve(cwd, CONFIG_FILE_NAME);
    const secretsPath = path.resolve(cwd, SECRETS_FILE_NAME);

    const configOption = yield* loadYamlIfExists(configPath);
    const secretsOption = yield* loadYamlIfExists(secretsPath);

    const messages: string[] = [];

    const baseConfig = cloneRecord(baseContext.config ?? {});
    const configSource = Option.getOrElse(configOption, () => baseConfig);
    let config = ensureMcpServers(configSource);

    if (Option.isSome(configOption)) {
      messages.push(`Loaded configuration from ${configPath}`);
    }

    const secrets = Option.getOrElse(secretsOption, () => ({} as UnknownRecord));

    yield* setEnvironmentVariables(secrets);

    config = applySecretsToConfig(config, secrets);

    return {
      context: {
        ...baseContext,
        config,
      },
      messages,
    } satisfies LoadAgentConfigurationSuccess;
  });

export const formatConfigError = (error: ConfigLoaderError): string => {
  switch (error._tag) {
    case 'ReadFileError':
      return `Failed to read ${error.path}: ${formatCause(error.cause)}`;
    case 'ParseYamlError':
      return `Failed to parse ${error.path}: ${formatCause(error.cause)}`;
  }
};

const loadYamlIfExists = (
  filePath: string
): Effect.Effect<Option.Option<UnknownRecord>, ConfigLoaderError> =>
  readFile(filePath).pipe(
    Effect.flatMap((content) => parseYaml(filePath, content)),
    Effect.map((value) => Option.some(cloneRecord(value))),
    Effect.catchIf(isReadFileError, (error) =>
      isNotFound(error.cause)
        ? Effect.succeed(Option.none())
        : Effect.fail(error)
    )
  );

const readFile = (filePath: string): Effect.Effect<string, ReadFileError> =>
  Effect.tryPromise({
    try: () => fs.readFile(filePath, 'utf8'),
    catch: (cause) => new ReadFileError({ path: filePath, cause }),
  });

const parseYaml = (
  filePath: string,
  content: string
): Effect.Effect<UnknownRecord, ParseYamlError> =>
  Effect.try({
    try: () => toRecord(yaml.load(content)),
    catch: (cause) => new ParseYamlError({ path: filePath, cause }),
  });

const toRecord = (value: unknown): UnknownRecord =>
  isRecord(value) ? { ...value } : {};

const cloneRecord = (value: UnknownRecord): UnknownRecord => ({ ...value });

const ensureMcpServers = (config: UnknownRecord): UnknownRecord => {
  const mcp = getRecord(config, 'mcp');
  const servers = mcp ? getRecord(mcp, 'servers') : undefined;

  return {
    ...config,
    mcp: {
      ...(mcp ?? {}),
      servers: { ...(servers ?? {}) },
    },
  };
};

const applySecretsToConfig = (
  config: UnknownRecord,
  secrets: UnknownRecord
): UnknownRecord => {
  const ensuredConfig = ensureMcpServers(config);
  const mcpSecrets = getRecord(secrets, 'mcp');
  const secretServers = mcpSecrets ? getRecord(mcpSecrets, 'servers') : undefined;

  if (!secretServers) {
    return ensuredConfig;
  }

  const existingServers = getRecord(ensuredConfig.mcp as UnknownRecord, 'servers') ?? {};
  const mergedServers: UnknownRecord = { ...existingServers };

  for (const [serverName, serverValue] of Object.entries(secretServers)) {
    const existingServerConfig = getRecord(mergedServers, serverName) ?? {};
    const serverRecord = toRecord(serverValue);
    const env = serverRecord.env;

    mergedServers[serverName] = {
      ...existingServerConfig,
      ...(env !== undefined ? { env } : {}),
    };
  }

  return {
    ...ensuredConfig,
    mcp: {
      ...(ensuredConfig.mcp as UnknownRecord),
      servers: mergedServers,
    },
  };
};

const setEnvironmentVariables = (
  secrets: UnknownRecord
): Effect.Effect<void> =>
  Effect.sync(() => {
    setEnvIfString(secrets, ['openai', 'api_key'], 'OPENAI_API_KEY');
    setEnvIfString(secrets, ['anthropic', 'api_key'], 'ANTHROPIC_API_KEY');
    setEnvIfString(secrets, ['deepseek', 'api_key'], 'DEEPSEEK_API_KEY');
    setEnvIfString(secrets, ['openrouter', 'api_key'], 'OPENROUTER_API_KEY');
  });

const setEnvIfString = (
  record: UnknownRecord,
  pathSegments: ReadonlyArray<string>,
  envName: string
): void => {
  const value = getNestedValue(record, pathSegments);
  if (typeof value === 'string' && value.length > 0) {
    process.env[envName] = value;
  }
};

const getNestedValue = (
  record: UnknownRecord,
  pathSegments: ReadonlyArray<string>
): unknown => {
  return pathSegments.reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[segment];
  }, record);
};

const getRecord = (
  record: UnknownRecord | undefined,
  key: string
): UnknownRecord | undefined => {
  if (!record) {
    return undefined;
  }
  const value = record[key];
  return isRecord(value) ? { ...value } : undefined;
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNotFound = (cause: unknown): boolean =>
  typeof cause === 'object' && cause !== null && 'code' in (cause as any) &&
  (cause as { code?: unknown }).code === 'ENOENT';

const isReadFileError = (error: unknown): error is ReadFileError =>
  error instanceof ReadFileError;

const formatCause = (cause: unknown): string => {
  if (cause instanceof Error) {
    return cause.message;
  }
  return JSON.stringify(cause);
};
