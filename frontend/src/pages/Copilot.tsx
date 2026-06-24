import { useState, useRef, useEffect } from "react";
import { api } from "../services/api";
import {
  MessageSquare,
  Send,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import "./Copilot.css";

interface Source {
  file: string;
  preview: string;
}

interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
  sources?: Source[];
}

const SUGGESTED_PROMPTS = [
  "Summarize uploaded documents",
  "List maintenance procedures",
  "Identify equipment failures",
  "Show compliance requirements",
];

export default function Copilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "assistant",
      text:
        "Welcome to PlantMind AI. Ask questions about uploaded manuals, SOPs, incident reports, maintenance procedures, compliance documents, and industrial assets.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [expandedSources, setExpandedSources] =
    useState<{ [key: number]: boolean }>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const handleSend = async (
    textToSend: string
  ) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = {
      sender: "user",
      text: textToSend,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await api.askCopilot(
        textToSend
      );

      let formattedSources: Source[] = [];

      if (
        Array.isArray(res.sources)
      ) {
        formattedSources =
          res.sources.map(
            (source: any) => {
              if (
                typeof source ===
                "string"
              ) {
                return {
                  file:
                    "Retrieved Context",
                  preview: source,
                };
              }

              return {
                file:
                  source.file ||
                  "Unknown File",

                preview:
                  source.preview ||
                  "",
              };
            }
          );
      }

      const assistantMessage: ChatMessage =
        {
          sender: "assistant",

          text:
            res.answer ||
            "No answer generated.",

          sources:
            formattedSources,
        };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);
    } catch (err) {
      console.error(err);

      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text:
            "Unable to query PlantMind. Verify that FastAPI, ChromaDB, and Gemini are running correctly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (
    index: number
  ) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="page-container copilot-page">
      <div className="copilot-layout glass-card">

        {/* Header */}

        <div className="copilot-header">
          <div className="title-area">
            <Sparkles
              className="spark-icon"
              size={22}
            />

            <div>
              <h3>
                AI Engineering Copilot
              </h3>

              <p>
                RAG + Gemini +
                ChromaDB +
                Neo4j
              </p>
            </div>
          </div>
        </div>

        {/* Chat Feed */}

        <div className="chat-feed">

          {messages.map(
            (msg, index) => (
              <div
                key={index}
                className={`chat-bubble-wrap ${msg.sender}`}
              >
                <div className="avatar-icon">
                  {msg.sender ===
                  "user"
                    ? "ME"
                    : "AI"}
                </div>

                <div className="bubble-content">

                  <div className="bubble-text">
                    {msg.text}
                  </div>

                  {msg.sources &&
                    msg.sources.length >
                      0 && (
                      <div className="sources-container">

                        <button
                          className="sources-toggle"
                          onClick={() =>
                            toggleSources(
                              index
                            )
                          }
                        >
                          <FileText
                            size={14}
                          />

                          <span>
                            {
                              msg
                                .sources
                                .length
                            }{" "}
                            Sources
                          </span>

                          {expandedSources[
                            index
                          ] ? (
                            <ChevronUp
                              size={14}
                            />
                          ) : (
                            <ChevronDown
                              size={14}
                            />
                          )}
                        </button>

                        {expandedSources[
                          index
                        ] && (
                          <div className="sources-list animate-slide-down">

                            {msg.sources.map(
                              (
                                src,
                                sIdx
                              ) => (
                                <div
                                  key={
                                    sIdx
                                  }
                                  className="source-item"
                                >
                                  <strong>
                                    {
                                      src.file
                                    }
                                  </strong>

                                  <p className="source-text">
                                    {
                                      src.preview
                                    }
                                  </p>
                                </div>
                              )
                            )}

                          </div>
                        )}

                      </div>
                    )}

                </div>
              </div>
            )
          )}

          {loading && (
            <div className="chat-bubble-wrap assistant loading">

              <div className="avatar-icon">
                AI
              </div>

              <div className="bubble-content">

                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts */}

        {messages.length === 1 && (
          <div className="suggestions-box">

            <p className="suggestion-label">
              Suggested Questions
            </p>

            <div className="suggestion-chips">

              {SUGGESTED_PROMPTS.map(
                (
                  prompt,
                  idx
                ) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() =>
                      handleSend(
                        prompt
                      )
                    }
                  >
                    <MessageSquare
                      size={14}
                    />

                    <span>
                      {prompt}
                    </span>
                  </button>
                )
              )}

            </div>

          </div>
        )}

        {/* Input */}

        <div className="chat-input-area">

          <input
            type="text"
            placeholder="Ask a question about uploaded documents..."
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            onKeyDown={(e) =>
              e.key === "Enter" &&
              handleSend(input)
            }
            disabled={loading}
          />

          <button
            className="send-btn"
            onClick={() =>
              handleSend(input)
            }
            disabled={
              !input.trim() ||
              loading
            }
          >
            <Send size={18} />
          </button>

        </div>

      </div>
    </div>
  );
}

