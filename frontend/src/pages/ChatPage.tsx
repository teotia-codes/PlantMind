import { useState } from "react";
import axios from "axios";

export default function ChatPage() {

  const [question,setQuestion] = useState("");
  const [answer,setAnswer] = useState("");

  const askQuestion = async () => {

    const res = await axios.post(
      "http://127.0.0.1:8000/chat",
      {
        question
      }
    );

    setAnswer(res.data.answer);
  };

  return (
    <div style={{padding:"20px"}}>
      <h1>PlantMind AI</h1>

      <input
        value={question}
        onChange={(e)=>setQuestion(e.target.value)}
        placeholder="Ask a question..."
      />

      <button onClick={askQuestion}>
        Ask
      </button>

      <pre>{answer}</pre>
    </div>
  );
}