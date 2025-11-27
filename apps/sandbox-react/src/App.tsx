import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useWebLLM } from "@web-llm-wrappers/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelId, setModelId] = useState<string>();
  const [newMessage, setNewMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      content: "You are a helpful AI agent helping users.",
      role: "system",
    },
  ]);
  const { engine, progressReport, getAvailableModels, loadModel } = useWebLLM({
    modelId,
    debug: true,
  });
  const [models] = useState(getAvailableModels());

  return (
    <div className="dark">
      <p>Step 1: Initialize WebLLM and Download Model</p>
      <div className="download-container flex flex-row gap-4">
        <Select
          onValueChange={(value) => {
            setModelId(value);
          }}
          value={modelId}
        >
          <SelectTrigger>
            <span id="model-select-placeholder">
              {modelId || "Select Model"}
            </span>
          </SelectTrigger>
          <SelectContent>
            {models.map(({ model_id }) => (
              <SelectItem value={model_id} key={model_id}>
                {model_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            if (modelId) {
              setModelLoaded(false);
              loadModel(modelId)?.then(() => {
                setModelLoaded(true);
              });
              // Users can do this, but this won't be reactive to changes to chatOptions
              // engine.reload(modelId);
            }
          }}
        >
          Download
        </Button>
      </div>
      {Boolean(progressReport) && (
        <p id="download-status">{progressReport.text}</p>
      )}

      <p>Step 2: Chat</p>
      <div className="chat-container">
        <div id="chat-box" className="chat-box flex flex-col">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${messageStyles[msg.role]}`}
            >
              <span>{msg.content}</span>
            </div>
          ))}
        </div>
        <div id="chat-stats" className="chat-stats hidden"></div>
        <form
          className="chat-input-container"
          onSubmit={(e) => {
            e.preventDefault();
            if (newMessage.trim() === "" || !engine || !modelLoaded) {
              return;
            }

            const newHistory = [
              ...chatHistory,
              { content: newMessage, role: "user" } as const,
            ];
            setChatHistory(newHistory);
            setNewMessage("");

            engine.chat.completions
              .create({
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
          <Input
            value={newMessage}
            type="text"
            id="user-input"
            placeholder="Type a message..."
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button id="send" disabled={!modelLoaded}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

export default App;
