from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import json
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for sessions
sessions: Dict[str, Dict[str, Any]] = {}

# Ollama configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "phi3:mini"


class CreateSessionRequest(BaseModel):
    subject: str
    topic: str
    key_points: List[str]
    question_count: int


class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_index: int
    answer_text: str


def call_ollama(prompt: str, max_retries: int = 3) -> str:
    """Call Ollama API with retry logic"""
    for attempt in range(max_retries):
        try:
            logger.info(f"Calling Ollama API (attempt {attempt + 1}/{max_retries})")
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "num_predict": 2048,  # Allow longer responses
                    },
                },
                timeout=120,  # Increased timeout for longer responses
            )
            response.raise_for_status()
            result = response.json()
            response_text = result.get("response", "")
            logger.info(f"Ollama response length: {len(response_text)} characters")
            logger.debug(f"Ollama raw response: {response_text[:500]}")

            # Check if response seems too short for the request
            if len(response_text) < 100:
                logger.warning(f"Response seems too short: {response_text}")

            return response_text
        except Exception as e:
            logger.error(f"Ollama API error on attempt {attempt + 1}: {str(e)}")
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=500, detail=f"Ollama API error: {str(e)}"
                )
            continue

    # Fallback (should never reach here due to exception above)
    raise HTTPException(status_code=500, detail="Failed to call Ollama API")


def generate_questions(
    subject: str, topic: str, key_points: List[str], count: int
) -> List[Dict[str, Any]]:
    """Generate viva questions using Ollama"""

    key_points_str = ", ".join(key_points)

    prompt = f"""Generate {count} exam questions as a JSON array.

Subject: {subject}
Topic: {topic}
Key concepts: {key_points_str}

Return a JSON array with {count} objects. Each object must have:
- question: the question text (string)
- expected_answer: array of 3-5 key points (array of strings)
- keywords: array of 3-6 keywords (array of strings)

Example:
[
  {{"question": "What is a process?", "expected_answer": ["A program in execution", "Has its own memory space", "Managed by the OS"], "keywords": ["process", "execution", "memory", "OS"]}},
  {{"question": "Explain context switching", "expected_answer": ["Saving process state", "Loading another process", "CPU switches between processes"], "keywords": ["context switch", "CPU", "process state"]}}
]

Generate {count} questions now as a JSON array:"""

    logger.info(f"Generating {count} questions for {subject} - {topic}")
    response = call_ollama(prompt)
    logger.info(f"Received response, attempting to parse JSON")
    logger.info(f"Full response: {response}")  # Log full response for debugging

    try:
        # Try to extract JSON from response (remove any markdown code blocks)
        response_clean = response.strip()

        logger.debug(f"Response preview (first 300 chars): {response_clean[:300]}")

        # Remove markdown code blocks if present
        if response_clean.startswith("```"):
            lines = response_clean.split("\n")
            # Remove first line (```json or ```)
            lines = lines[1:]
            # Remove last line (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            response_clean = "\n".join(lines).strip()

        # Try to find JSON array in the response
        start_idx = response_clean.find("[")
        end_idx = response_clean.rfind("]")

        if start_idx != -1 and end_idx != -1:
            response_clean = response_clean[start_idx : end_idx + 1]

        # Try to parse as JSON array first
        try:
            questions = json.loads(response_clean)
        except json.JSONDecodeError as e:
            # If it fails, the model might have returned multiple separate JSON objects
            # Try to extract individual objects and combine them into an array
            logger.info(
                f"Failed to parse as array ({str(e)}), attempting to parse multiple objects"
            )
            logger.info(f"Cleaned response to parse: {response_clean[:500]}")
            questions = []

            # Find all JSON objects in the response using a more robust approach
            depth = 0
            obj_start = -1
            i = 0
            in_string = False
            escape_next = False

            while i < len(response_clean):
                char = response_clean[i]

                # Handle string literals (ignore braces inside strings)
                if escape_next:
                    escape_next = False
                elif char == "\\":
                    escape_next = True
                elif char == '"':
                    in_string = not in_string
                elif not in_string:
                    if char == "{":
                        if depth == 0:
                            obj_start = i
                        depth += 1
                    elif char == "}":
                        depth -= 1
                        if depth == 0 and obj_start != -1:
                            # Found a complete object
                            obj_str = response_clean[obj_start : i + 1]
                            try:
                                obj = json.loads(obj_str)
                                questions.append(obj)
                                logger.info(
                                    f"Successfully parsed object {len(questions)}: {list(obj.keys())}"
                                )
                            except json.JSONDecodeError as parse_err:
                                logger.warning(f"Failed to parse object: {parse_err}")
                                logger.debug(f"Failed object string: {obj_str[:200]}")
                            obj_start = -1
                i += 1

        if not isinstance(questions, list):
            raise ValueError(f"Response is not a list. Got: {type(questions).__name__}")

        if len(questions) == 0:
            logger.error(f"No valid question objects found. Full response: {response}")
            raise ValueError(
                f"No valid question objects found in response. Check logs for full response."
            )

        logger.info(f"Successfully parsed {len(questions)} questions")

        if len(questions) != count:
            # Pad or trim to exact count
            if len(questions) < count:
                logger.warning(
                    f"Got {len(questions)} questions, expected {count}. Duplicating to reach target."
                )
                # Duplicate questions cyclically to reach count
                while len(questions) < count:
                    questions.append(
                        questions[
                            len(questions)
                            % (len(questions) if len(questions) > 0 else 1)
                        ]
                    )
            else:
                logger.info(f"Got {len(questions)} questions, trimming to {count}")
                questions = questions[:count]
        return questions
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse Ollama response as JSON: {str(e)}. Response preview: {response[:200]}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing questions: {str(e)}. Response preview: {response[:200]}",
        )


def grade_answer(
    question: str, expected_answer: List[str], keywords: List[str], student_answer: str
) -> Dict[str, Any]:
    """Grade student answer using Ollama"""

    expected_str = "\n".join([f"- {point}" for point in expected_answer])
    keywords_str = ", ".join(keywords)

    prompt = f"""You are an exam grader. Compare the student's answer to the expected answer and keywords.

Question: {question}

Expected Answer Points:
{expected_str}

Important Keywords: {keywords_str}

Student's Answer:
{student_answer}

Evaluate the answer and return ONLY a JSON object with:
- "score": A number from 0 to 100 representing the answer quality
- "feedback": A 1-3 sentence constructive feedback (string)
- "missing_keywords": An array of important keywords that were missing from the answer (array of strings)

Scoring guide:
- 90-100: Excellent, covers all key points with correct keywords
- 70-89: Good, covers most points with minor gaps
- 50-69: Acceptable, covers some points but missing important concepts
- 30-49: Poor, major concepts missing
- 0-29: Inadequate, shows little understanding

Return ONLY the JSON object, no other text.

Example format:
{{
  "score": 72,
  "feedback": "Your answer correctly identifies the basic concept but lacks detail about atomic operations. Consider explaining how semaphores prevent race conditions.",
  "missing_keywords": ["atomic", "race condition"]
}}

Grade the answer now:"""

    response = call_ollama(prompt)

    try:
        # Try to extract JSON from response (remove any markdown code blocks)
        response_clean = response.strip()

        # Remove markdown code blocks if present
        if response_clean.startswith("```"):
            lines = response_clean.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            response_clean = "\n".join(lines).strip()

        # Try to find JSON object in the response
        start_idx = response_clean.find("{")
        end_idx = response_clean.rfind("}")

        if start_idx != -1 and end_idx != -1:
            response_clean = response_clean[start_idx : end_idx + 1]

        grade = json.loads(response_clean)

        # Ensure score is within bounds
        if "score" in grade:
            grade["score"] = max(0, min(100, int(grade["score"])))

        # Ensure required fields exist
        if "feedback" not in grade:
            grade["feedback"] = "Answer received and graded."
        if "missing_keywords" not in grade:
            grade["missing_keywords"] = []

        return grade
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse grading response as JSON: {str(e)}. Response preview: {response[:200]}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing grade: {str(e)}. Response preview: {response[:200]}",
        )


@app.post("/create_session")
async def create_session(request: CreateSessionRequest):
    """Create a new viva session with generated questions"""

    # Generate session ID
    session_id = f"session_{uuid.uuid4().hex[:8]}"

    # Generate questions
    questions = generate_questions(
        request.subject, request.topic, request.key_points, request.question_count
    )

    # Store session
    sessions[session_id] = {
        "session_id": session_id,
        "subject": request.subject,
        "topic": request.topic,
        "key_points": request.key_points,
        "questions": questions,
        "answers": [],
        "current_index": 0,
    }

    return {"session_id": session_id, "total_questions": len(questions)}


@app.get("/next_question/{session_id}")
async def next_question(session_id: str):
    """Get the next question in the session"""

    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    index = session["current_index"]

    if index >= len(session["questions"]):
        return {
            "completed": True,
            "message": "All questions completed",
            "total_questions": len(session["questions"]),
        }

    question = session["questions"][index]

    return {
        "index": index,
        "question": question["question"],
        "expected": question["expected_answer"],
        "keywords": question["keywords"],
        "total_questions": len(session["questions"]),
    }


@app.post("/submit_answer")
async def submit_answer(request: SubmitAnswerRequest):
    """Submit and grade an answer"""

    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[request.session_id]

    if request.question_index >= len(session["questions"]):
        raise HTTPException(status_code=400, detail="Invalid question index")

    question = session["questions"][request.question_index]

    # Grade the answer
    grade = grade_answer(
        question["question"],
        question["expected_answer"],
        question["keywords"],
        request.answer_text,
    )

    # Store the answer and grade
    session["answers"].append(
        {
            "question_index": request.question_index,
            "answer_text": request.answer_text,
            "grade": grade,
        }
    )

    # Move to next question
    session["current_index"] = request.question_index + 1

    return {
        "grade": grade,
        "question_index": request.question_index,
        "next_available": session["current_index"] < len(session["questions"]),
    }


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get complete session data"""

    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]

    # Calculate statistics
    total_questions = len(session["questions"])
    answered = len(session["answers"])

    if answered > 0:
        total_score = sum(answer["grade"]["score"] for answer in session["answers"])
        average_score = total_score / answered
    else:
        average_score = 0

    return {
        "session_id": session_id,
        "subject": session["subject"],
        "topic": session["topic"],
        "key_points": session["key_points"],
        "total_questions": total_questions,
        "answered": answered,
        "average_score": round(average_score, 2),
        "questions": session["questions"],
        "answers": session["answers"],
        "current_index": session["current_index"],
    }


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "message": "AI Viva Agent Backend",
        "active_sessions": len(sessions),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
