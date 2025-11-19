import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

function VivaStudent({ sessionId, onBack }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Fetch next question
  const fetchNextQuestion = async () => {
    setLoading(true);
    setError(null);
    setGrading(null);
    setAnswer("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/next_question/${sessionId}`
      );

      if (response.data.completed) {
        setIsCompleted(true);
        await fetchSessionStats();
      } else {
        setCurrentQuestion(response.data);

        // Speak the question using TTS
        speakQuestion(response.data.question);
      }
    } catch (err) {
      console.error("Error fetching question:", err);
      setError(err.response?.data?.detail || "Failed to load question");
    } finally {
      setLoading(false);
    }
  };

  // Speak question using browser Speech Synthesis API
  const speakQuestion = (questionText) => {
    if ("speechSynthesis" in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Small delay to ensure cancellation completes
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(questionText);
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
        };

        utterance.onend = () => {
          console.log("Finished speaking question");
        };

        window.speechSynthesis.speak(utterance);
        console.log(
          "Started speaking question:",
          questionText.substring(0, 50) + "..."
        );
      }, 100);
    } else {
      console.warn("Speech synthesis not supported in this browser");
    }
  };

  // Fetch session statistics
  const fetchSessionStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/session/${sessionId}`);
      setSessionStats(response.data);
    } catch (err) {
      console.error("Error fetching session stats:", err);
    }
  };

  // Submit answer for grading
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setError("Please provide an answer before submitting");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/submit_answer`, {
        session_id: sessionId,
        question_index: currentQuestion.index,
        answer_text: answer.trim(),
      });

      setGrading(response.data.grade);
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError(err.response?.data?.detail || "Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle next question
  const handleNextQuestion = () => {
    fetchNextQuestion();
  };

  // Replay question audio
  const handleReplayQuestion = () => {
    if (currentQuestion) {
      speakQuestion(currentQuestion.question);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognitionInstance.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        // Update answer with final transcript
        if (finalTranscript) {
          setAnswer((prev) => prev + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === "not-allowed") {
          setError(
            "Microphone access denied. Please enable microphone permissions."
          );
        } else if (event.error === "no-speech") {
          setError("No speech detected. Please try again.");
        }
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Start voice recording
  const startRecording = () => {
    if (recognition) {
      try {
        recognition.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    } else {
      setError(
        "Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
    }
  };

  // Clear answer
  const clearAnswer = () => {
    setAnswer("");
  };

  // Load first question on mount
  useEffect(() => {
    if (sessionId) {
      fetchNextQuestion();
    }

    // Cleanup: stop any speech when component unmounts
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognition) {
        recognition.stop();
      }
    };
  }, [sessionId]);

  // Get score color class
  const getScoreClass = (score) => {
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  };

  const getResultClass = (score) => {
    if (score >= 80) return "";
    if (score >= 50) return "medium-score";
    return "low-score";
  };

  // Render completion summary
  if (isCompleted && sessionStats) {
    return (
      <div className="card">
        <div className="completion-summary">
          <h3>🎉 Viva Completed!</h3>

          <div className="summary-stats">
            <p>
              <strong>Subject:</strong> {sessionStats.subject}
            </p>
            <p>
              <strong>Topic:</strong> {sessionStats.topic}
            </p>
            <p>
              <strong>Questions Answered:</strong> {sessionStats.answered} /{" "}
              {sessionStats.total_questions}
            </p>
            <p>
              <strong>Average Score:</strong>{" "}
              <span
                className={`stat-highlight ${getScoreClass(
                  sessionStats.average_score
                )}`}
              >
                {sessionStats.average_score}%
              </span>
            </p>
          </div>

          <div style={{ marginTop: "20px" }}>
            {sessionStats.average_score >= 80 && (
              <p
                style={{
                  color: "#28a745",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                Excellent performance! 🌟
              </p>
            )}
            {sessionStats.average_score >= 50 &&
              sessionStats.average_score < 80 && (
                <p
                  style={{
                    color: "#ffc107",
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                  }}
                >
                  Good job! Keep practicing to improve further. 💪
                </p>
              )}
            {sessionStats.average_score < 50 && (
              <p
                style={{
                  color: "#dc3545",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                }}
              >
                Keep learning! Review the topics and try again. 📚
              </p>
            )}
          </div>

          <button
            onClick={onBack}
            className="btn"
            style={{ marginTop: "20px" }}
          >
            ← Back to Teacher Setup
          </button>
        </div>
      </div>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading question...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !currentQuestion) {
    return (
      <div className="card">
        <div className="error">{error}</div>
        <button onClick={onBack} className="btn" style={{ marginTop: "20px" }}>
          ← Back to Teacher Setup
        </button>
      </div>
    );
  }

  // Render question and answer interface
  return (
    <div className="card" style={{ maxWidth: "900px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <h2 style={{ margin: 0 }}>🎓 AI Viva Session</h2>
        <button onClick={onBack} className="btn btn-secondary">
          ← Exit
        </button>
      </div>

      {currentQuestion && (
        <>
          {/* Progress Bar */}
          <div className="progress-info" style={{ marginBottom: "30px" }}>
            <span>
              Question {currentQuestion.index + 1} of{" "}
              {currentQuestion.total_questions}
            </span>
            <span>Session: {sessionId.slice(0, 15)}...</span>
          </div>

          {/* Avatar and Question Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 20px",
              background:
                "linear-gradient(135deg, #667eea22 0%, #764ba222 100%)",
              borderRadius: "16px",
              marginBottom: "30px",
            }}
          >
            {/* User Avatar */}
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3rem",
                marginBottom: "30px",
                boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
                border: "4px solid white",
              }}
            >
              👤
            </div>

            {/* Question */}
            <div style={{ textAlign: "center", maxWidth: "700px" }}>
              <h3
                style={{
                  color: "#667eea",
                  fontSize: "1.1rem",
                  marginBottom: "15px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Question
              </h3>
              <p
                style={{
                  fontSize: "1.4rem",
                  lineHeight: "1.8",
                  color: "#333",
                  fontWeight: "500",
                  marginBottom: "20px",
                }}
              >
                {currentQuestion.question}
              </p>

              <button
                onClick={handleReplayQuestion}
                className="btn btn-secondary"
                style={{
                  padding: "10px 24px",
                  fontSize: "0.95rem",
                }}
              >
                🔊 Replay Question
              </button>
            </div>
          </div>

          {!grading ? (
            <>
              {/* Voice Recording Section */}
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                  background: "#f8f9fa",
                  borderRadius: "12px",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    color: "#667eea",
                    fontSize: "1.1rem",
                    marginBottom: "20px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Your Answer
                </h3>

                {/* Recording Button */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="btn"
                    disabled={isSubmitting}
                    style={{
                      background:
                        "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
                      padding: "20px 50px",
                      fontSize: "1.2rem",
                      marginBottom: "20px",
                      boxShadow: "0 5px 20px rgba(220, 53, 69, 0.4)",
                    }}
                  >
                    🎤 Start Speaking
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="btn"
                    style={{
                      background:
                        "linear-gradient(135deg, #28a745 0%, #218838 100%)",
                      padding: "20px 50px",
                      fontSize: "1.2rem",
                      marginBottom: "20px",
                      animation: "pulse 1.5s infinite",
                      boxShadow: "0 5px 20px rgba(40, 167, 69, 0.4)",
                    }}
                  >
                    ⏹️ Stop Speaking
                  </button>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div
                    style={{
                      background: "#fff3cd",
                      border: "2px solid #ffc107",
                      padding: "20px",
                      borderRadius: "12px",
                      marginBottom: "20px",
                      color: "#856404",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "15px",
                      fontSize: "1.1rem",
                      fontWeight: "600",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "2rem",
                        animation: "pulse 1s infinite",
                      }}
                    >
                      🎙️
                    </span>
                    <span>Listening... Speak your answer now</span>
                  </div>
                )}

                {/* Transcribed Answer Display */}
                {answer && (
                  <div
                    style={{
                      background: "white",
                      border: "2px solid #667eea",
                      borderRadius: "12px",
                      padding: "20px",
                      marginBottom: "15px",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <strong style={{ color: "#667eea" }}>
                        Your Response:
                      </strong>
                      <button
                        onClick={clearAnswer}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.85rem",
                        }}
                      >
                        🗑️ Clear
                      </button>
                    </div>
                    <textarea
                      id="answer"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Your answer will appear here..."
                      disabled={isSubmitting || isRecording}
                      style={{
                        width: "100%",
                        minHeight: "120px",
                        padding: "15px",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontFamily: "inherit",
                        resize: "vertical",
                        background: "#f8f9fa",
                      }}
                    />
                  </div>
                )}
              </div>

              {error && <div className="error">{error}</div>}

              {/* Submit Button */}
              <button
                onClick={handleSubmitAnswer}
                className="btn"
                disabled={isSubmitting || !answer.trim()}
                style={{
                  width: "100%",
                  padding: "18px",
                  fontSize: "1.1rem",
                  fontWeight: "600",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  boxShadow: "0 5px 20px rgba(102, 126, 234, 0.4)",
                  marginTop: "10px",
                }}
              >
                {isSubmitting ? (
                  <>
                    <span>Grading...</span>
                    <div
                      className="spinner"
                      style={{
                        display: "inline-block",
                        width: "16px",
                        height: "16px",
                        marginLeft: "10px",
                        borderWidth: "2px",
                      }}
                    ></div>
                  </>
                ) : (
                  "✓ Submit Answer"
                )}
              </button>
            </>
          ) : (
            <>
              <div
                className={`grading-result ${getResultClass(grading.score)}`}
              >
                <h3>Grading Results:</h3>

                <div
                  className={`score-display ${getScoreClass(grading.score)}`}
                >
                  Score: {grading.score}/100
                </div>

                <div className="feedback">
                  <strong>Feedback:</strong>
                  <p>{grading.feedback}</p>
                </div>

                {grading.missing_keywords &&
                  grading.missing_keywords.length > 0 && (
                    <div className="missing-keywords">
                      <h4>⚠️ Missing Keywords:</h4>
                      <div>
                        {grading.missing_keywords.map((keyword, idx) => (
                          <span key={idx} className="keyword-tag">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div className="button-group">
                <button onClick={handleNextQuestion} className="btn">
                  Next Question →
                </button>
              </div>
            </>
          )}

          <div
            style={{
              marginTop: "30px",
              padding: "15px",
              background: "#f8f9fa",
              borderRadius: "8px",
              fontSize: "0.9rem",
            }}
          >
            <strong>💡 Tips for better answers:</strong>
            <ul
              style={{
                marginTop: "10px",
                marginBottom: "0",
                paddingLeft: "20px",
              }}
            >
              <li>Use voice input for natural, conversational answers</li>
              <li>Include key technical terms and concepts</li>
              <li>Explain your answer clearly and concisely</li>
              <li>Cover multiple aspects of the topic if relevant</li>
              <li>Use examples when appropriate</li>
              <li>You can edit voice-transcribed text before submitting</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default VivaStudent;
