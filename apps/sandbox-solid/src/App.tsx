import { createSignal } from "solid-js";
import { Button } from "./components/ui/button";
import { TextField, TextFieldInput } from "./components/ui/text-field";
import { useWebLLM } from "@web-llm-wrappers/solid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import "./App.css";

interface ChatMessage {
  content: string;
  role: "user" | "assistant" | "system";
}

const messageStyles = {
  user: "bg-blue-500 text-white self-end",
  assistant: "bg-gray-200 text-black self-start",
  system: "bg-green-500 text-white self-center",
};

function App() {
  const [modelLoaded, setModelLoaded] = createSignal(false);
  const [modelId, setModelId] = createSignal<string>();
  const [newMessage, setNewMessage] = createSignal<string>("");
  const [chatHistory, setChatHistory] = createSignal<ChatMessage[]>([
    {
      content: "You are a helpful AI agent helping users.",
      role: "system",
    },
  ]);
  const { engine, progressReport, getAvailableModels, loadModel } = useWebLLM({
    modelId: modelId(),
    debug: true,
  });
  const [models] = createSignal(getAvailableModels());

  return (
    <>
      <p>Step 1: Initialize WebLLM and Download Model</p>
      <div class="download-container">
        <Select
          value={modelId()}
          onChange={(change) => {
            setModelId(change || "");
          }}
          options={models().map((model) => model.model_id)}
          placeholder="Select a model"
          itemComponent={(props) => (
            <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
          )}
        >
          <SelectTrigger>
            <SelectValue<string>>
              {(state) => state.selectedOption()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent class="bg-white w-[400px]" />
        </Select>
        <Button
          variant={"default"}
          id="download"
          onClick={() => {
            const currentModelId = modelId();
            if (currentModelId) {
              setModelLoaded(false);
              loadModel(currentModelId).then(() => {
                setModelLoaded(true);
              });
            }
          }}
        >
          Download
        </Button>
      </div>
      {Boolean(progressReport()) && (
        <p id="download-status">{progressReport()?.text}</p>
      )}

      <p>Step 2: Chat</p>
      <div class="chat-container">
        <div id="chat-box" class="chat-box flex flex-col">
          {chatHistory().map((msg, index) => (
            <div class={`chat-message ${messageStyles[msg.role]}`}>
              <span>{msg.content}</span>
            </div>
          ))}
        </div>
        <div id="chat-stats" class="chat-stats hidden"></div>
        <form
          class="chat-input-container"
          onSubmit={(e) => {
            e.preventDefault();
            if (newMessage().trim() === "" || !engine || !modelLoaded) {
              return;
            }

            const newHistory = [
              ...chatHistory(),
              { content: newMessage(), role: "user" } as const,
            ];
            setChatHistory(newHistory);
            setNewMessage("");

            engine()
              .chat.completions.create({
                stream: true,
                messages: newHistory,
                temperature: 0,
              })
              .then(async (stream) => {
                let assistantMessage = "";
                for await (const chunk of stream) {
                  assistantMessage += chunk.choices[0].delta.content || "";
                  setChatHistory([
                    ...newHistory,
                    { content: assistantMessage, role: "assistant" } as const,
                  ]);
                }
              });
          }}
        >
          <TextField>
            <TextFieldInput
              type="text"
              id="user-input"
              placeholder="Type a message..."
              value={newMessage()}
              onChange={(e) => setNewMessage(e.target.value)}
            />
          </TextField>
          <Button id="send" disabled={!modelLoaded()}>
            Send
          </Button>
        </form>
      </div>
    </>
  );
}

export default App;
