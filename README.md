# 🎓 AI Viva Agent

An intelligent AI-powered viva question system that generates questions, speaks them aloud, accepts typed answers, grades responses, and provides detailed feedback. Built with **FastAPI** backend and **React** frontend, powered by **Ollama Phi-3** model.

## ✨ Features

- 🤖 **AI Question Generation**: Automatically generates viva questions based on subject, topic, and key points
- 🔊 **Text-to-Speech**: Questions are spoken aloud automatically using browser TTS
- 🎤 **Voice Input**: Students can answer questions by speaking (speech recognition)
- ✍️ **Typed Answers**: Students can also type their answers for flexibility
- 📊 **AI Grading**: Answers are graded by AI with scores (0-100) and detailed feedback
- 🎯 **Keyword Analysis**: Identifies missing important keywords in answers
- 📈 **Session Tracking**: Complete session management with progress tracking and statistics

## 🏗️ Project Structure

```
ai-viva-agent/
├── backend/
│   ├── main.py              # FastAPI backend with all endpoints
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── TeacherForm.js    # Teacher setup interface
│   │   │   └── VivaStudent.js    # Student viva interface
│   │   ├── App.js          # Main React component
│   │   ├── App.css         # Styles
│   │   ├── index.js        # React entry point
│   │   └── index.css       # Global styles
│   └── package.json        # Node dependencies
└── README.md               # This file
```

## 🚀 Prerequisites

Before running the application, ensure you have:

1. **Python 3.8+** installed
2. **Node.js 16+** and npm installed
3. **Ollama** installed and running with phi3:mini model

### Installing Ollama and Phi-3

1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Pull the phi3:mini model:
   ```bash
   ollama pull phi3:mini
   ```
3. Verify Ollama is running:
   ```bash
   ollama list
   ```

## 📦 Installation

### Backend Setup

1. Navigate to the backend folder:

   ```bash
   cd backend
   ```

2. Create a virtual environment (optional but recommended):

   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:

   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Frontend Setup

1. Navigate to the frontend folder:

   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## ▶️ Running the Application

### Step 1: Start Ollama

Make sure Ollama is running on port 11434:

```bash
ollama serve
```

### Step 2: Start Backend

In the `backend` folder:

```bash
python main.py
```

The backend will start on **http://localhost:8000**

You can verify it's running by visiting: http://localhost:8000

### Step 3: Start Frontend

In the `frontend` folder:

```bash
npm start
```

The React app will start on **http://localhost:3000** and open automatically in your browser.

## 🎯 How to Use

### Teacher Setup (Creating a Viva Session)

1. Fill in the form with:

   - **Subject**: e.g., "Operating Systems"
   - **Topic**: e.g., "Process Synchronization"
   - **Key Points**: Enter important concepts (one per line or comma-separated)
     ```
     Critical section
     Semaphore
     Deadlock
     Mutex
     ```
   - **Question Count**: Number of questions (1-20)

2. Click **"🚀 Create Viva Session"**

3. Wait for AI to generate questions (this may take 10-30 seconds)

### Student Viva (Answering Questions)

1. Listen to the question (automatically spoken via TTS)

   - Click **"🔊 Replay Question"** to hear it again

2. Answer the question using **voice or text**:

   **Voice Input (Recommended):**

   - Click **"🎤 Start Recording"** button
   - Speak your answer clearly
   - Click **"⏹️ Stop Recording"** when finished
   - Review and edit the transcribed text if needed

   **Text Input:**

   - Type your answer directly in the text area

   **Tips:**

   - You can combine both: start with voice, then edit the text
   - Click **"🗑️ Clear Answer"** to start over

3. Click **"✓ Submit Answer"**

4. View your grading results:

   - **Score** (0-100)
   - **Feedback** (constructive comments)
   - **Missing Keywords** (important terms you missed)

5. Click **"Next Question →"** to continue

6. After all questions, view your **completion summary** with average score

## 🔌 API Endpoints

### Backend API (http://localhost:8000)

| Endpoint                      | Method | Description                                         |
| ----------------------------- | ------ | --------------------------------------------------- |
| `/`                           | GET    | Health check                                        |
| `/create_session`             | POST   | Create new viva session with AI-generated questions |
| `/next_question/{session_id}` | GET    | Get next question in session                        |
| `/submit_answer`              | POST   | Submit answer for AI grading                        |
| `/session/{session_id}`       | GET    | Get complete session data and statistics            |

### Example API Calls

**Create Session:**

```json
POST http://localhost:8000/create_session
{
  "subject": "Operating Systems",
  "topic": "Process Synchronization",
  "key_points": ["Critical section", "Semaphore", "Deadlock"],
  "question_count": 6
}
```

**Submit Answer:**

```json
POST http://localhost:8000/submit_answer
{
  "session_id": "session_abc123",
  "question_index": 0,
  "answer_text": "A semaphore is a synchronization primitive..."
}
```

## 🤖 How AI Works

### Question Generation

The system sends a prompt to Ollama Phi-3 asking it to:

- Generate exactly N questions based on subject, topic, and key points
- For each question, provide:
  - The question text
  - Expected answer points (3-5 bullet points)
  - Important keywords (3-6 terms)

### Answer Grading

When a student submits an answer, the system:

1. Sends the answer along with expected answer and keywords to Ollama
2. AI compares and evaluates the answer
3. Returns:
   - **Score** (0-100)
   - **Feedback** (1-3 sentences)
   - **Missing keywords** (list of important terms not mentioned)

## 🎨 UI Features

- **Gradient Background**: Modern purple gradient design
- **Card-based Layout**: Clean, organized interface
- **Voice Input**: Speech-to-text with visual recording indicator
- **Text-to-Speech**: Automatic question narration
- **Progress Tracking**: Shows current question number and session ID
- **Score Visualization**: Color-coded scores (green/yellow/red)
- **Responsive Design**: Works on desktop and tablet
- **Loading States**: Spinners and disabled states during processing
- **Real-time Transcription**: See your words appear as you speak

## 🛠️ Troubleshooting

### Backend Issues

**Problem**: "Connection refused" error

- **Solution**: Make sure Ollama is running (`ollama serve`)

**Problem**: "Model not found"

- **Solution**: Pull the model: `ollama pull phi3:mini`

**Problem**: Questions take too long to generate

- **Solution**: This is normal for first request. Subsequent requests are faster. You can also use a smaller model or reduce question count.

### Frontend Issues

**Problem**: "Failed to fetch" or CORS errors

- **Solution**: Ensure backend is running on port 8000

**Problem**: Text-to-Speech not working

- **Solution**: TTS requires HTTPS or localhost. Some browsers may need permission. Check browser console for errors.

**Problem**: Voice input not working

- **Solution**:
  - Grant microphone permissions when prompted
  - Use Chrome, Edge, or Safari (best support for Web Speech API)
  - Firefox has limited speech recognition support
  - Ensure you're on HTTPS or localhost

**Problem**: Voice transcription is inaccurate

- **Solution**:
  - Speak clearly and at a moderate pace
  - Reduce background noise
  - Use a good quality microphone
  - You can always edit the transcribed text before submitting

**Problem**: Blank screen on `npm start`

- **Solution**: Clear cache: `npm cache clean --force` then reinstall: `rm -rf node_modules package-lock.json && npm install`

## 🔧 Configuration

### Change Ollama Model

Edit `backend/main.py` line 24:

```python
MODEL_NAME = "phi3:mini"  # Change to another model like "llama2" or "mistral"
```

### Change Backend Port

Edit `backend/main.py` last line:

```python
uvicorn.run(app, host="0.0.0.0", port=8000)  # Change port number
```

Also update frontend API URL in `TeacherForm.js` and `VivaStudent.js`:

```javascript
const API_BASE_URL = "http://localhost:8000"; // Update port
```

### Change Frontend Port

Create `frontend/.env` file:

```
PORT=3001
```

## 📝 Dependencies

### Backend

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `requests` - HTTP client for Ollama
- `pydantic` - Data validation
- `python-multipart` - Form data parsing

### Frontend

- `react` - UI library
- `react-dom` - React rendering
- `axios` - HTTP client
- `react-scripts` - React build tools

## 🌟 Future Enhancements

- [ ] Add user authentication
- [ ] Save sessions to database (currently in-memory)
- [ ] Export results to PDF
- [ ] Multi-language support
- [ ] Voice input for answers (speech recognition)
- [ ] Question difficulty levels
- [ ] Timer per question
- [ ] Analytics dashboard

## 📄 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for improvements!

## 📧 Support

If you encounter issues:

1. Check Ollama is running: `ollama list`
2. Verify backend is accessible: http://localhost:8000
3. Check browser console for frontend errors
4. Ensure all dependencies are installed

---

**Built with ❤️ using FastAPI, React, and Ollama Phi-3**
