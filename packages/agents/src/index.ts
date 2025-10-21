import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type * as CoreTypes from '@testbase/agents-core';
import type { OpenAIProvider as OpenAIProviderType } from '@testbase/agents-openai';

// In CommonJS, require and __dirname are already available
declare const require: NodeRequire;
declare const __dirname: string;

const dynamicImport = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<any>;

let coreModule: typeof CoreTypes | undefined;
function getCore(): typeof CoreTypes {
  if (coreModule) {
    return coreModule;
  }
  try {
    coreModule = require('@testbase/agents-core') as typeof CoreTypes;
  } catch {
    const localPath = resolve(__dirname, '../../agents-core/dist/index.js');
    coreModule = require(localPath) as typeof CoreTypes;
  }
  return coreModule;
}

let openAIProviderCtorPromise:
  | Promise<typeof OpenAIProviderType>
  | undefined;

async function loadOpenAIProvider(): Promise<typeof OpenAIProviderType> {
  if (openAIProviderCtorPromise) {
    return openAIProviderCtorPromise;
  }

  openAIProviderCtorPromise = (async () => {
    try {
      const mod = await dynamicImport('@testbase/agents-openai');
      return mod.OpenAIProvider as typeof OpenAIProviderType;
    } catch {
      const localUrl = pathToFileURL(
        resolve(__dirname, '../../agents-openai/dist/index.mjs'),
      ).href;
      const mod = await dynamicImport(localUrl);
      return mod.OpenAIProvider as typeof OpenAIProviderType;
    }
  })();

  return openAIProviderCtorPromise;
}

let llmProvider: any | undefined;

async function ensureProviderForAgent(agent: CoreTypes.Agent<any, any>) {
  const Core = getCore();

  const agentType = agent.agentType ?? 'llm';
  if (agentType === 'llm') {
    if (!llmProvider) {
      const OpenAIProviderCtor = await loadOpenAIProvider();
      llmProvider = new OpenAIProviderCtor();
    }
    Core.setDefaultModelProvider(llmProvider);
  }
  // Computer agents bypass the model provider entirely
  // They execute directly via runtime.execute() in run.ts
}

const coreRun = getCore().run;

export async function run<
  TAgent extends CoreTypes.Agent<any, any>,
  TContext = undefined,
>(
  agent: TAgent,
  input: string | CoreTypes.AgentInputItem[] | CoreTypes.RunState<TContext, TAgent>,
  options?:
    | CoreTypes.StreamRunOptions<TContext>
    | CoreTypes.NonStreamRunOptions<TContext>,
): Promise<
  CoreTypes.RunResult<TContext, TAgent> | CoreTypes.StreamedRunResult<TContext, TAgent>
> {
  await ensureProviderForAgent(agent);
  return coreRun(agent, input, options as any);
}

export * from '@testbase/agents-core';
