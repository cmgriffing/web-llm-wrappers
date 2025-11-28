import type { ChatOptions, InitProgressReport, MLCEngineConfig } from '@mlc-ai/web-llm';
import { CreateMLCEngine, prebuiltAppConfig, MLCEngine } from '@mlc-ai/web-llm';
import { readable, get, writable } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';

function getAvailableModels() {
	return prebuiltAppConfig.model_list;
}

export function useWebLLM({
	modelId,
	engineConfig,
	chatOptions,
	debug = false
}: {
	modelId?: string | string[];
	engineConfig?: MLCEngineConfig;
	chatOptions?: ChatOptions;
	debug?: boolean;
}) {
	const writableEngine = writable<MLCEngine | null>(null);
	const writableProgressReport = writable<InitProgressReport | null>(null);

	const loadModel = async (modelId: string | string[]) => {
		const _engine = get(writableEngine);
		if (_engine) {
			return _engine.reload(modelId);
		}
	};

	onMount(async () => {
		if (modelId) {
			const newEngine = await CreateMLCEngine(modelId, {
				...engineConfig,
				initProgressCallback: (newProgressReport: InitProgressReport) => {
					engineConfig?.initProgressCallback?.(newProgressReport);
					writableProgressReport.set(newProgressReport);
					if (debug) {
						console.log('DEBUG: WebLLM React:', { newProgressReport });
					}
				}
			});
			writableEngine.set(newEngine);
		} else {
			writableEngine.set(
				new MLCEngine({
					...engineConfig,
					initProgressCallback: (newProgressReport: InitProgressReport) => {
						engineConfig?.initProgressCallback?.(newProgressReport);
						writableProgressReport.set(newProgressReport);
						if (debug) {
							console.log('DEBUG: WebLLM React:', { newProgressReport });
						}
					}
				})
			);
		}
	});

	onDestroy(() => {
		const _engine = get(writableEngine);
		_engine?.unload();
		writableEngine.set(null);
	});

	return {
		engine: readable(get(writableEngine), (set) => {
			return writableEngine.subscribe((newEngine) => {
				set(newEngine);
			});
		}),
		progressReport: readable(get(writableProgressReport), (set) => {
			return writableProgressReport.subscribe((newProgressReport) => {
				set(newProgressReport);
			});
		}),
		getAvailableModels,
		loadModel
	};
}
