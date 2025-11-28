<script lang="ts">


  import { useWebLLM } from '@web-llm-wrappers/svelte';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';

  interface ChatMessage {
    content: string;
    role: "user" | "assistant" | "system";
  }

  const messageStyles = {
    user: "bg-blue-500 text-white self-end",
    assistant: "bg-gray-200 text-black self-start",
    system: "bg-green-500 text-white self-center",
  };

  const { engine, progressReport, getAvailableModels, loadModel } = useWebLLM({
    debug: true,
  });

  const availableModels = getAvailableModels();
  let selectedModel = $state<string>();
  let modelLoaded = $state(false);

  let newMessage = $state("");
  let chatHistory = $state<ChatMessage[]>([
    {
      content: "You are a helpful AI agent helping users.",
      role: "system",
    },
  ]);

  async function downloadModel() {
    console.log("downloading model", selectedModel);
    if (selectedModel) {
      await loadModel(selectedModel);
      modelLoaded = true;
    }
  }


  function sendMessage(e: Event) {
    e.preventDefault();
    if (newMessage.trim() === "" || !$engine || !modelLoaded) {
      console.log("No message to send or model not loaded");
      return;
    }

    console.log("Sending message", newMessage);

    const newHistory = [
      ...chatHistory,
      { content: newMessage, role: "user" } as const,
    ];
    chatHistory = newHistory;
    newMessage = "";

    $engine?.chat.completions
      .create({
        stream: true,
        messages: newHistory,
        temperature: 0,
      })
      .then(async (stream) => {
        console.log("Stream received", stream);
        let assistantMessage = "";
        for await (const chunk of stream) {
          assistantMessage += chunk.choices[0].delta.content || "";

          chatHistory = [
            ...newHistory,
            { content: assistantMessage, role: "assistant" } as const,
          ];
        }
      });
    
  }

</script>

<p>Step 1: Initialize WebLLM and Download Model</p>
<div class="download-container">
    <Select type="single" bind:value={selectedModel}>
        <SelectTrigger>
            {selectedModel || 'Select a model'}
        </SelectTrigger>
        <SelectContent>
            {#each availableModels as model}
                <SelectItem value={model.model_id}>{model.model_id}</SelectItem>
            {/each}
        </SelectContent>
    </Select>
	<Button id="download" onclick={downloadModel}>Download Model</Button>
</div>

{#if $progressReport}
<p id="download-status" >{$progressReport?.text}</p>
{/if}

<p>Step 2: Chat</p>
<div class="chat-container">
	<div id="chat-box" class="chat-box flex flex-col">
    {#each chatHistory as msg, index}
      <div class={`chat-message ${messageStyles[msg.role]}`}>
        <span>{msg.content}</span>
      </div>
    {/each}
  </div>
	<div id="chat-stats" class="chat-stats hidden"></div>
	<form class="chat-input-container" onsubmit={sendMessage}>
		<Input type="text" id="user-input" placeholder="Type a message..." bind:value={newMessage} />
		<Button id="send" disabled={!modelLoaded} type="submit">Send</Button>
  </form>
</div>
