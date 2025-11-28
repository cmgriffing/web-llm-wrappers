<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

import { useWebLLM } from "@web-llm-wrappers/vue3";
import { ref } from "vue";

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

const modelId = ref<string>();
const modelLoaded = ref(false);
const newMessage = ref("");
const chatHistory = ref<ChatMessage[]>([
  {
    content: "You are a helpful AI agent helping users.",
    role: "system",
  },
]);

function downloadModel() {
  if (modelId.value) {
    modelLoaded.value = false;
    loadModel(modelId.value)?.then(() => {
      modelLoaded.value = true;
    });
  }
}

function sendMessage() {
  if (newMessage.value.trim() === "" || !engine || !modelLoaded.value) {
    return;
  }

  const newHistory = [
    ...chatHistory.value,
    { content: newMessage.value, role: "user" } as const,
  ];
  chatHistory.value = newHistory;
  newMessage.value = "";

  engine.value?.chat.completions
    .create({
      stream: true,
      messages: newHistory,
      temperature: 0,
    })
    .then(async (stream) => {
      let assistantMessage = "";
      for await (const chunk of stream) {
        assistantMessage += chunk.choices[0]?.delta.content || "";

        chatHistory.value = [
          ...newHistory,
          { content: assistantMessage, role: "assistant" } as const,
        ];
      }
    });
}
</script>

<template>
  <p>Step 1: Initialize WebLLM and Download Model</p>
  <div class="download-container flex flex-row gap-4">
    <Select v-model="modelId">
      <SelectTrigger>
        <SelectValue>
          {{ modelId || "Select Model" }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="model in availableModels"
          :key="model.model_id"
          :value="model.model_id"
        >
          {{ model.model_id }}
        </SelectItem>
      </SelectContent>
    </Select>
    <Button id="download" @click="downloadModel">Download</Button>
  </div>
  <p id="download-status" v-if="progressReport">
    {{ progressReport.value.text }}
  </p>

  <p>Step 2: Chat</p>
  <div class="chat-container">
    <div id="chat-box" className="chat-box flex flex-col">
      <div
        v-for="(msg, index) in chatHistory"
        :key="index"
        :class="`chat-message ${messageStyles[msg.role]}`"
      >
        <span>{{ msg.content }}</span>
      </div>
    </div>
    <div id="chat-stats" class="chat-stats hidden"></div>
    <form class="chat-input-container" @submit.prevent="sendMessage">
      <Input
        type="text"
        id="user-input"
        placeholder="Type a message..."
        v-model="newMessage"
      />
      <Button id="send" :disabled="!modelLoaded">Send</Button>
    </form>
  </div>
</template>

<style scoped></style>
