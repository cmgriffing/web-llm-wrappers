import { ref, watch } from "vue";
import {
  MLCEngine,
  ChatOptions,
  MLCEngineConfig,
  InitProgressReport,
  prebuiltAppConfig,
  CreateMLCEngine,
} from "@mlc-ai/web-llm";

function getAvailableModels() {
  return prebuiltAppConfig.model_list;
}

export function useWebLLM({
  modelId,
  engineConfig,
  chatOptions,
  debug = false,
}: {
  modelId?: string | string[];
  engineConfig?: MLCEngineConfig;
  chatOptions?: ChatOptions;
  debug?: boolean;
}) {
  const engine = ref<MLCEngine | null>(null);
  const progressReport = ref<InitProgressReport | null>(null);

  const loadModel = async (modelId: string | string[]) => {
    if (engine.value) {
      return engine.value.reload(modelId);
    }
  };

  watch(
    () => modelId,
    async (modelId) => {
      if (modelId) {
        const newEngine = await CreateMLCEngine(modelId, {
          ...engineConfig,
          initProgressCallback: (newProgressReport) => {
            engineConfig?.initProgressCallback?.(newProgressReport);
            progressReport.value = newProgressReport;

            if (debug) {
              console.log("DEBUG: WebLLM React:", { progressReport });
            }
          },
        });
        engine.value = newEngine;
      } else {
        engine.value = new MLCEngine({
          ...engineConfig,
          initProgressCallback: (progressReport) => {
            engineConfig?.initProgressCallback?.(progressReport);

            if (debug) {
              console.log("DEBUG: WebLLM React:", { progressReport });
            }
          },
        });
      }

      return () => {
        engine.value?.unload();
        engine.value = null;
      };
    },
    { immediate: true }
  );

  return {
    engine: null,
    progressReport: null,
    getAvailableModels: () => [],
    loadModel: () => Promise.resolve(null),
  };
}
