import React, { useState } from "react";
import TeacherForm from "./components/TeacherForm";
import VivaStudent from "./components/VivaStudent";
import "./App.css";

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [viewMode, setViewMode] = useState("teacher"); // 'teacher' or 'student'

  const handleSessionCreated = (newSessionId) => {
    setSessionId(newSessionId);
    setViewMode("student");
  };

  const handleBackToTeacher = () => {
    setSessionId(null);
    setViewMode("teacher");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎓 AI Viva Agent</h1>
        <p className="subtitle">Powered by Ollama Phi-3</p>
      </header>

      <main className="app-main">
        {viewMode === "teacher" ? (
          <TeacherForm onSessionCreated={handleSessionCreated} />
        ) : (
          <VivaStudent sessionId={sessionId} onBack={handleBackToTeacher} />
        )}
      </main>

      <footer className="app-footer">
        <p>AI-powered viva system using FastAPI + React + Ollama</p>
      </footer>
    </div>
  );
}

export default App;
