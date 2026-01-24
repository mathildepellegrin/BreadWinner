import os
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Body, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
import google.generativeai as genai
from functools import lru_cache
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Configuration ---
class Settings:
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    ALLOWED_ORIGINS: List[str] = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    MODEL_NAME: str = "gemini-1.5-flash"
    MAX_TEXT_LENGTH: int = 50000
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")

settings = Settings()

# Initialize Gemini
if not settings.GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables!")
else:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# --- Pydantic Models ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = None

class ResumeParseRequest(BaseModel):
    text: str = Field(..., max_length=settings.MAX_TEXT_LENGTH)
    
class JobIngestRequest(BaseModel):
    url: Optional[str] = None
    description: Optional[str] = Field(None, max_length=settings.MAX_TEXT_LENGTH)
    
    @validator('url', 'description')
    def validate_input(cls, v, values):
        if not values.get('url') and not v:
            raise ValueError('Either url or description must be provided')
        return v

class TailorResumeRequest(BaseModel):
    resume: Dict[str, Any]
    jd: Dict[str, Any]

class InterviewQuestionRequest(BaseModel):
    profile: Dict[str, Any]
    jd: Dict[str, Any]
    history: List[Dict[str, str]] = []
    mode: str = Field(default="technical", pattern="^(technical|behavioral|case)$")

class InterviewReportRequest(BaseModel):
    history: List[Dict[str, str]]
    jd: Dict[str, Any]

class PrepMaterialsRequest(BaseModel):
    profile: Dict[str, Any]
    jd: Dict[str, Any]

# --- Security ---
security = HTTPBearer()

# Simple token store (in production, use Redis or a database)
valid_tokens = set()

def create_token(user_id: str) -> str:
    """Create a simple bearer token (in production, use JWT)"""
    token = str(uuid.uuid4())
    valid_tokens.add(token)
    return token

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify bearer token"""
    token = credentials.credentials
    if token not in valid_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return token

# --- FastAPI App ---
app = FastAPI(
    title="HireSync AI - Secure Backend",
    description="AI-powered interview preparation and resume optimization",
    version="2.0.0"
)

# CORS - restricted to specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# --- Helper Functions ---
@lru_cache()
def get_model(name: str = settings.MODEL_NAME):
    """Get Gemini model with caching"""
    try:
        return genai.GenerativeModel(name)
    except Exception as e:
        logger.error(f"Failed to initialize model: {e}")
        raise HTTPException(status_code=500, detail="AI service unavailable")

async def safe_generate_json(model, prompt: str, max_retries: int = 2) -> Dict[str, Any]:
    """Safely generate JSON with retries and validation"""
    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            # Clean and parse response
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            
            return json.loads(text.strip())
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse failed (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail="Failed to parse AI response")
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            raise HTTPException(status_code=500, detail="AI service error")

# --- Public Routes ---
@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "model": settings.MODEL_NAME,
        "api_key_configured": bool(settings.GEMINI_API_KEY)
    }

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """
    Login endpoint (simplified - implement proper auth in production)
    In production: verify credentials against database, use JWT tokens
    """
    # TODO: Verify password against database
    user_id = str(uuid.uuid4())
    token = create_token(user_id)
    
    return {
        "id": user_id,
        "email": request.email,
        "name": request.email.split('@')[0].capitalize(),
        "token": token
    }

# --- Protected Routes ---
@app.post("/api/profile/parse")
async def parse_resume(
    request: ResumeParseRequest,
    token: str = Depends(verify_token)
):
    """Parse resume text into structured JSON format"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    model = get_model()
    prompt = f"""
    Parse the following resume text into a structured JSON format with these exact fields:
    {{
        "name": "Full Name",
        "email": "email@example.com",
        "phone": "phone number",
        "summary": "professional summary",
        "experience": [
            {{"title": "Job Title", "company": "Company", "duration": "dates", "description": "what they did"}}
        ],
        "education": [
            {{"degree": "Degree", "institution": "School", "year": "Year"}}
        ],
        "projects": [
            {{"name": "Project Name", "description": "what it does", "technologies": ["tech1", "tech2"]}}
        ],
        "skills": ["skill1", "skill2", "skill3"]
    }}
    
    Resume text:
    {request.text}
    """
    
    return await safe_generate_json(model, prompt)

@app.post("/api/jobs/ingest")
async def ingest_job(
    request: JobIngestRequest,
    token: str = Depends(verify_token)
):
    """Ingest job description from URL or text"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    model = get_model()
    
    if request.url:
        prompt = f"""
        Extract job information from the following URL context.
        Return JSON with: title, company, description, requirements (array), benefits (array).
        
        URL: {request.url}
        
        If you cannot access the URL, return a structured response indicating this.
        """
    else:
        prompt = f"""
        Extract job information from the following text.
        Return JSON with: title, company, description, requirements (array), benefits (array).
        
        Job Description:
        {request.description}
        """
    
    try:
        job_data = await safe_generate_json(model, prompt)
        return {
            "title": job_data.get("title", "Position"),
            "company": job_data.get("company", "Company"),
            "description": job_data.get("description", request.description or ""),
            "requirements": job_data.get("requirements", []),
            "benefits": job_data.get("benefits", []),
            "url": request.url
        }
    except Exception as e:
        logger.error(f"Job ingestion failed: {e}")
        # Fallback response
        return {
            "title": "Position",
            "company": "Company",
            "description": request.description or "",
            "requirements": [],
            "benefits": [],
            "url": request.url,
            "error": "Partial processing - manual review recommended"
        }

@app.post("/api/resume/tailor")
async def tailor_resume(
    request: TailorResumeRequest,
    token: str = Depends(verify_token)
):
    """Tailor resume for specific job description"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    model = get_model()
    prompt = f"""
    Act as an expert Career Strategist. Tailor the resume for the job description.
    
    Return JSON with these exact fields:
    {{
        "tailored": {{resume object with optimized content}},
        "coverLetter": "professional cover letter text",
        "analysis": {{
            "matchScore": 85,
            "strengths": ["strength1", "strength2"],
            "gaps": ["gap1", "gap2"],
            "recommendations": ["rec1", "rec2"]
        }}
    }}
    
    Original Resume:
    {json.dumps(request.resume, indent=2)}
    
    Target Job Description:
    {json.dumps(request.jd, indent=2)}
    """
    
    return await safe_generate_json(model, prompt)

@app.post("/api/interviews/question")
async def get_question(
    request: InterviewQuestionRequest,
    token: str = Depends(verify_token)
):
    """Generate interview question with feedback"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    model = get_model()
    prompt = f"""
    You are an expert {request.mode} interviewer for: {request.jd.get('title', 'Position')} at {request.jd.get('company', 'Company')}.
    
    Candidate Profile Summary:
    {json.dumps(request.profile, indent=2)[:1000]}
    
    Interview Mode: {request.mode}
    
    Conversation History:
    {json.dumps(request.history[-5:], indent=2)}
    
    Tasks:
    1. If there was a previous answer, provide constructive feedback (2-3 sentences)
    2. Ask ONE new {request.mode} question appropriate for the role
    3. Make the question challenging but fair
    
    Return JSON:
    {{
        "feedbackForLastAnswer": "feedback text or empty string if first question",
        "question": "your interview question"
    }}
    """
    
    return await safe_generate_json(model, prompt)

@app.post("/api/interviews/report")
async def get_report(
    request: InterviewReportRequest,
    token: str = Depends(verify_token)
):
    """Generate comprehensive interview feedback report"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    model = get_model()
    prompt = f"""
    Generate a detailed interview performance report.
    
    Role: {request.jd.get('title', 'Position')} at {request.jd.get('company', 'Company')}
    
    Interview Transcript:
    {json.dumps(request.history, indent=2)}
    
    Provide:
    1. Overall performance rating (1-10)
    2. Strengths demonstrated
    3. Areas for improvement
    4. Specific examples from the interview
    5. Actionable recommendations
    
    Format as markdown.
    """
    
    try:
        response = model.generate_content(prompt)
        return {"report": response.text}
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@app.post("/api/prep/materials")
async def get_prep(
    request: PrepMaterialsRequest,
    token: str = Depends(verify_token)
):
    """Generate interview preparation materials"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    model = get_model()
    prompt = f"""
    Generate comprehensive interview prep materials.
    
    Candidate Profile:
    {json.dumps(request.profile, indent=2)[:2000]}
    
    Target Role:
    {json.dumps(request.jd, indent=2)}
    
    Return JSON with:
    {{
        "coverLetter": "tailored cover letter",
        "technicalQuestions": [
            {{"question": "Q1", "hint": "approach hint", "keyPoints": ["point1", "point2"]}}
        ],
        "behavioralQuestions": [
            {{"question": "Q1", "framework": "STAR", "exampleAnswer": "sample structure"}}
        ],
        "companyResearch": {{
            "keyFacts": ["fact1", "fact2"],
            "questionsToAsk": ["Q1", "Q2"]
        }}
    }}
    
    Provide 5 questions for each category.
    """
    
    return await safe_generate_json(model, prompt)

# --- Error Handlers ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")