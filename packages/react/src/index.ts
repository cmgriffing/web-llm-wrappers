import {
  MLCEngine,
  ChatOptions,
  MLCEngineConfig,
  InitProgressReport,
  prebuiltAppConfig,
  CreateMLCEngine,
} from "@mlc-ai/web-llm";
import { useCallback, useEffect, useState } from "react";

function getAvailableModels() {
  return prebuiltAppConfig.model_list;
}

const singletons = {
  engine: new MLCEngine({
    initProgressCallback: (progressReport) => {
      console.log("DEBUG: WebLLM React:", { progressReport });
    },
  }),
};

export function useWebLLM({
  modelId,
  engineConfig,
  chatOptions,
  debug = false,
  singleton = false,
}: {
  modelId?: string | string[];
  engineConfig?: MLCEngineConfig;
  chatOptions?: ChatOptions;
  debug?: boolean;
  singleton?: boolean;
}) {
  const [engine, setEngine] = useState<MLCEngine | null>(null);
  // TODO: add support for a singleton version of these
  const [progressReport, setProgressReport] = useState<InitProgressReport>();
  const [modelsLoaded, setModelsLoaded] = useState<Record<string, boolean>>({});

  const loadModel = useCallback(
    (modelId: string) => {
      if (engine) {
        return engine.reload(modelId, chatOptions).then(() => {
          setModelsLoaded((prev) => ({ ...prev, [modelId]: true }));
        });
      }
    },
    [engine, chatOptions]
  );

  useEffect(() => {
    if (singleton) {
      setEngine(singletons.engine);
      singletons.engine.setInitProgressCallback((progressReport) => {
        setProgressReport(progressReport);
        if (debug) {
          console.log("DEBUG: WebLLM React:", { progressReport });
        }
      });
    } else if (modelId) {
      CreateMLCEngine(modelId, engineConfig, chatOptions).then((engine) => {
        setEngine(engine);
      });
    } else {
      setEngine(
        new MLCEngine({
          ...engineConfig,
          initProgressCallback: (progressReport) => {
            setProgressReport(progressReport);
            engineConfig?.initProgressCallback?.(progressReport);

            if (debug) {
              console.log("DEBUG: WebLLM React:", { progressReport });
            }
          },
        })
      );
    }

    return () => {
      engine?.unload();
      setEngine(null);
    };
  }, [engineConfig, debug, singleton]);

  return {
    engine,
    progressReport,
    getAvailableModels,
    loadModel,
    modelsLoaded,
  };
}
