import React, { useState } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

function TeacherForm({ onSessionCreated }) {
  const [formData, setFormData] = useState({
    subject: "",
    topic: "",
    key_points: "",
    question_count: 6,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "question_count" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (
      !formData.subject.trim() ||
      !formData.topic.trim() ||
      !formData.key_points.trim()
    ) {
      setError("Please fill in all fields");
      return;
    }

    if (formData.question_count < 1 || formData.question_count > 20) {
      setError("Question count must be between 1 and 20");
      return;
    }

    setLoading(true);

    try {
      // Parse key points from textarea (comma or newline separated)
      const keyPointsArray = formData.key_points
        .split(/[\n,]+/)
        .map((point) => point.trim())
        .filter((point) => point.length > 0);

      if (keyPointsArray.length === 0) {
        setError("Please provide at least one key point");
        setLoading(false);
        return;
      }

      const requestData = {
        subject: formData.subject.trim(),
        topic: formData.topic.trim(),
        key_points: keyPointsArray,
        question_count: formData.question_count,
      };

      console.log("Creating session with:", requestData);

      const response = await axios.post(
        `${API_BASE_URL}/create_session`,
        requestData
      );

      console.log("Session created:", response.data);

      if (response.data.session_id) {
        onSessionCreated(response.data.session_id);
      } else {
        setError("Failed to create session: No session ID returned");
      }
    } catch (err) {
      console.error("Error creating session:", err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to create session. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>👨‍🏫 Teacher Setup</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Configure the viva session by providing subject details and key points
      </p>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="subject">Subject *</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="e.g., Operating Systems"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="topic">Topic *</label>
          <input
            type="text"
            id="topic"
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            placeholder="e.g., Process Synchronization"
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="key_points">
            Key Points * (one per line or comma-separated)
          </label>
          <textarea
            id="key_points"
            name="key_points"
            value={formData.key_points}
            onChange={handleChange}
            placeholder="Enter key points, e.g.:&#10;Critical section&#10;Semaphore&#10;Deadlock&#10;Mutex"
            disabled={loading}
            required
          />
          <small style={{ color: "#666", display: "block", marginTop: "5px" }}>
            Separate key points with commas or new lines
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="question_count">Number of Questions *</label>
          <input
            type="number"
            id="question_count"
            name="question_count"
            value={formData.question_count}
            onChange={handleChange}
            min="1"
            max="20"
            disabled={loading}
            required
          />
          <small style={{ color: "#666", display: "block", marginTop: "5px" }}>
            Choose between 1 and 20 questions
          </small>
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? (
            <>
              <span>Generating Questions...</span>
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
            "🚀 Create Viva Session"
          )}
        </button>
      </form>

      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "#e7f3ff",
          borderRadius: "8px",
          fontSize: "0.9rem",
        }}
      >
        <strong>💡 Tips:</strong>
        <ul
          style={{ marginTop: "10px", marginBottom: "0", paddingLeft: "20px" }}
        >
          <li>Be specific with your topic for better questions</li>
          <li>Include 3-6 key points for comprehensive coverage</li>
          <li>Questions are generated using AI (Ollama phi3:mini)</li>
          <li>Make sure Ollama is running on port 11434</li>
        </ul>
      </div>
    </div>
  );
}

export default TeacherForm;
