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
  const [engine, setEngine] = useState<MLCEngine | null>(null);
  const [progressReport, setProgressReport] = useState<InitProgressReport>();

  const loadModel = useCallback(
    (modelId: string) => {
      if (engine) {
        return engine.reload(modelId, chatOptions);
      }
    },
    [engine, chatOptions]
  );

  useEffect(() => {
    if (modelId) {
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
  }, [engineConfig, debug]);

  return { engine, progressReport, getAvailableModels, loadModel };
}
