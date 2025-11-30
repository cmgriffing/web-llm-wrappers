import { ChangeDetectorRef, Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InitProgressReport, MLCEngine } from '@mlc-ai/web-llm';
import { WebLLMService } from '@web-llm-wrappers/angular';

import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';

interface ChatMessage {
  content: string;
  role: 'user' | 'assistant' | 'system';
}

@Component({
  selector: 'app-root',
  imports: [
    HlmButtonImports,
    HlmInputImports,
    BrnSelectImports,
    HlmSelectImports,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [provideIcons({ lucideChevronUp, lucideChevronDown })],
})
export class App {
  messageStyles = {
    user: 'bg-blue-500 text-white self-end',
    assistant: 'bg-gray-200 text-black self-start',
    system: 'bg-green-500 text-white self-center',
  };

  protected availableModels: ReturnType<typeof WebLLMService.prototype.getAvailableModels> = [];
  protected selectedModel: string | string[] = '';
  protected modelLoaded = false;

  protected newMessage = '';
  protected chatHistory: ChatMessage[] = [
    {
      content: 'You are a helpful AI agent helping users.',
      role: 'system',
    },
  ];

  engine: MLCEngine | null = null;
  progressReport: InitProgressReport | null = null;

  constructor(
    private webLLMService: WebLLMService,
    private cd: ChangeDetectorRef,
  ) {
    this.availableModels = this.webLLMService.getAvailableModels();

    this.webLLMService.engine.pipe(takeUntilDestroyed()).subscribe((engine) => {
      this.engine = engine;
      this.cd.detectChanges();
    });

    this.webLLMService.progressReport.pipe(takeUntilDestroyed()).subscribe((progressReport) => {
      this.progressReport = progressReport;
      this.cd.detectChanges();
    });

    this.webLLMService.init(this.selectedModel).then(() => {
      console.log('WebLLM initialized');
    });
  }

  async downloadModel() {
    if (this.selectedModel) {
      await this.webLLMService.loadModel(this.selectedModel);
      this.modelLoaded = true;
    }
  }

  sendMessage(e: Event) {
    e.preventDefault();
    if (this.newMessage.trim() === '' || !this.engine || !this.modelLoaded) {
      return;
    }

    const newHistory = [...this.chatHistory, { content: this.newMessage, role: 'user' } as const];
    this.chatHistory = newHistory;
    this.newMessage = '';

    this.engine?.chat.completions
      .create({
        stream: true,
        messages: newHistory,
        temperature: 0,
      })
      .then(async (stream) => {
        let assistantMessage = '';
        for await (const chunk of stream) {
          assistantMessage += chunk.choices[0].delta.content || '';

          this.chatHistory = [
            ...newHistory,
            { content: assistantMessage, role: 'assistant' } as const,
          ];

          this.cd.detectChanges();
        }
      });
  }
}
