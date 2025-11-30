import { Injectable, OnDestroy } from '@angular/core';
import {
  ChatOptions,
  CreateMLCEngine,
  MLCEngine,
  MLCEngineConfig,
  prebuiltAppConfig,
} from '@mlc-ai/web-llm';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebLLMService implements OnDestroy {
  private _engine: MLCEngine | null = null;
  private _engineSubject = new Subject<MLCEngine | null>();
  engine = this._engineSubject.asObservable();

  private _progressReport = new Subject<any>();
  progressReport = this._progressReport.asObservable();

  private debug = false;

  constructor() {}

  getAvailableModels() {
    return prebuiltAppConfig.model_list;
  }

  async init(
    modelId: string | string[],
    engineConfig?: MLCEngineConfig,
    chatOptions?: ChatOptions,
    debug = false,
  ) {
    this.debug = debug;

    if (modelId) {
      this._engine = await CreateMLCEngine(modelId, {
        ...engineConfig,
        initProgressCallback: (newProgressReport: any) => {
          engineConfig?.initProgressCallback?.(newProgressReport);
          this._progressReport.next(newProgressReport);

          if (debug) {
            console.log('DEBUG: WebLLM React:', { newProgressReport });
          }
        },
      });
    } else {
      this._engine = new MLCEngine({
        ...engineConfig,
        initProgressCallback: (newProgressReport: any) => {
          engineConfig?.initProgressCallback?.(newProgressReport);
          this._progressReport.next(newProgressReport);

          if (debug) {
            console.log('DEBUG: WebLLM React:', { newProgressReport });
          }
        },
      });
    }
    this._engineSubject.next(this._engine);
  }

  loadModel(modelId: string | string[]) {
    console.log('loadModel', modelId);
    return this._engine?.reload(modelId).then(() => {
      console.log('loadModel success');
      this._engineSubject.next(this._engine);
      return this._engine;
    });
  }

  ngOnDestroy() {
    this._engine?.unload();
    this._engineSubject.next(null);
  }
}
