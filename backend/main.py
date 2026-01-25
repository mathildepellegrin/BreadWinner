import os
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Body, Depends, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
import logging
from sqlalchemy.orm import Session
from openai import OpenAI

# Internal module imports
from database import SessionLocal, engine, get_db
import models
import crud

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# --- Configuration ---
class Settings:
    OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
    ALLOWED_ORIGINS: List[str] = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    MODEL_NAME: str = "google/gemini-2.0-flash-001"
    MAX_TEXT_LENGTH: int = 50000
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "hackathon-secret-key-2026")

settings = Settings()

# --- Initialize OpenRouter Client ---
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY,
    default_headers={
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "BreadWinner AI",
    }
)

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
valid_tokens = {} 

def create_token(user_id: int) -> str:
    token = str(uuid.uuid4())
    valid_tokens[token] = user_id
    return token

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    if token not in valid_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return valid_tokens[token]

async def get_current_user(user_id: int = Depends(verify_token), db: Session = Depends(get_db)) -> models.User:
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- FastAPI App ---
app = FastAPI(
    title="BreadWinner AI - Secure Backend",
    description="AI-powered interview preparation and resume optimization",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Function ---
async def safe_generate_json(prompt: str, max_retries: int = 2) -> Dict[str, Any]:
    """Safely generate JSON via OpenRouter with retries"""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=settings.MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                response_format={ "type": "json_object" }
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"AI generation failed (attempt {attempt + 1}): {e}")
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail="AI service error")

# --- Public Routes ---
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "model": settings.MODEL_NAME,
        "api_key_configured": bool(settings.OPENROUTER_API_KEY)
    }

@app.post("/api/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, request.email)
    if not user:
        name = request.email.split('@')[0].capitalize()
        user = crud.create_user(db, request.email, name, request.password)
    token = create_token(user.id)
    return {"id": user.id, "email": user.email, "name": user.name, "token": token}

# --- Company Questions Cache ---
@app.get("/api/prep/company/{company_name}")
async def get_company_prep(company_name: str, db: Session = Depends(get_db), token: str = Depends(verify_token)):
    """Check cache for company questions; generate via AI if not found."""
    company = crud.get_company_by_name(db, company_name)
    
    if company:
        logger.info(f"Cache Hit for {company_name}")
        return {"company": company.name, "questions": company.questions}

    logger.info(f"Cache Miss for {company_name}. Generating new questions...")
    prompt = f"""
    Generate 15 interview questions for {company_name}. 
    Categories: 5 'leetcode', 5 'technical', 5 'behavioral'.
    For 'leetcode', include 'leetcode_slug' (e.g., 'two-sum').
    Return JSON: {{ "questions": [ {{ "category": "leetcode", "title": "Two Sum", "text": "Given an array...", "leetcode_slug": "two-sum", "ideal_answer": "Use hashmap..." }} ] }}
    """
    ai_data = await safe_generate_json(prompt)
    
    new_company = crud.create_company(db, company_name.capitalize())
    
    for q in ai_data.get('questions', []):
        crud.create_question(
            db, new_company.id,
            q['category'],
            q['title'], 
            q['text'],
            q['ideal_answer'],
            q.get('leetcode_slug')
        )
    
    db.refresh(new_company)
    return {"company": new_company.name, "questions": new_company.questions}

# --- Protected Routes ---
@app.post("/api/profile/parse")
async def parse_resume(request: ResumeParseRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    prompt = f"Parse the following resume text into a structured JSON format: {request.text}"
    parsed_data = await safe_generate_json(prompt)
    resume = crud.create_resume(db, current_user.id, f"Resume_{datetime.now().strftime('%Y%m%d')}", parsed_data, request.text)
    return {"id": resume.id, "data": parsed_data}

@app.post("/api/jobs/ingest")
async def ingest_job(
    request: JobIngestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ingest job description and save to database"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    model = get_model()
    
    if request.url:
        prompt = f"""
        Extract job information from the following URL context.
        Return JSON with: title, company, description, requirements (array), benefits (array).
        
        URL: {request.url}
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
        
        # Save to database
        job_app = crud.create_job_application(
            db=db,
            user_id=current_user.id,
            title=job_data.get("title", "Position"),
            company=job_data.get("company", "Company"),
            description=job_data.get("description", request.description or ""),
            requirements=job_data.get("requirements", []),
            benefits=job_data.get("benefits", []),
            url=request.url
        )
        
        return {
            "id": job_app.id,
            "title": job_app.title,
            "company": job_app.company,
            "status": job_app.status,
            "url": job_app.url
        }
    except Exception as e:
        logger.error(f"Job ingestion failed: {e}")
        # Fallback manual creation
        job_app = crud.create_job_application(
            db=db,
            user_id=current_user.id,
            title="New Position",
            company="Company",
            description=request.description or "",
            url=request.url
        )
        return {
            "id": job_app.id,
            "title": job_app.title,
            "company": job_app.company,
            "status": job_app.status,
            "url": job_app.url,
            "warning": "Partial processing"
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
        "title": "Job Title",
        "company": "Company Name", 
        "description": "Job description",
        "requirements": ["req1", "req2"],
        "benefits": ["benefit1", "benefit2"]
    }}
    
    Source: {request.url or request.description}"""
    
    job_data = await safe_generate_json(prompt)
    
    tailored_response = await safe_generate_json(model, prompt)
    
    # If possible, find the job application and update it with tailored content
    # For now, we return it; frontend can handle associating it
    return tailored_response

@app.patch("/api/jobs/{job_id}/status")
async def update_job_status(
    job_id: int,
    request: JobStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the status of a job application"""
    job = db.query(JobApplication).filter(JobApplication.id == job_id, JobApplication.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.status = request.status
    db.commit()
    db.refresh(job)
    return {"status": job.status}

@app.get("/api/jobs/{job_id}/analysis")
async def get_job_analysis(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get gap analysis and match score for a job"""
    job = crud.get_job_application(db, job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.gaps or not job.match_score:
        # Generate analysis if not present
        resume = crud.get_active_resume(db, current_user.id)
        if not resume:
            raise HTTPException(status_code=400, detail="Active resume required for analysis")
            
        model = get_model()
        prompt = f"""
        Perform a gap analysis between this resume and job description.
        Resume: {json.dumps(resume.content)}
        Job: {job.description}
        
        Return JSON:
        {{
            "matchScore": 0-100,
            "gaps": ["missing skill 1", "missing skill 2"],
            "strengths": ["matched skill 1"]
        }}
        """
        analysis = await safe_generate_json(model, prompt)
        job.match_score = analysis.get("matchScore")
        job.gaps = analysis.get("gaps")
        db.commit()
        db.refresh(job)
        return analysis
        
    return {
        "matchScore": job.match_score,
        "gaps": job.gaps
    }

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate interview preparation materials (Study Lab)"""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    job = crud.get_job_application(db, request.job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    resume = crud.get_active_resume(db, current_user.id)
    if not resume:
        raise HTTPException(status_code=400, detail="Active resume required")

    model = get_model()
    prompt = f"""
    Generate Study Lab materials for: {job.title} at {job.company}.
    
    Job Description: {job.description}
    Candidate Resume: {json.dumps(resume.content)}
    
    Return JSON with:
    {{
        "leetcodeRoadmap": [
            {{"title": "Two Sum", "difficulty": "Easy", "link": "https://leetcode.com/problems/two-sum/", "relevance": "Top IBM Question"}}
        ],
        "cheatSheets": [
            {{"topic": "Spring Boot", "tips": ["Tip 1", "Tip 2"]}}
        ]
    }}
    """
    
    return await safe_generate_json(model, prompt)

# --- Error Handlers ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "id": job_app.id,
        "title": job_app.title,
        "company": job_app.company,
        "description": job_app.description,
        "requirements": job_app.requirements,
        "benefits": job_app.benefits,
        "url": job_app.url,
        "created_at": job_app.created_at
    }

# --- New Database Management Endpoints ---
@app.get("/api/dashboard/stats")
async def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard overview statistics"""
    jobs_count = db.query(JobApplication).filter(JobApplication.user_id == current_user.id).count()
    interviews_count = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id).count()
    # Assuming success rate is based on "Offer" status
    offers_count = db.query(JobApplication).filter(JobApplication.user_id == current_user.id, JobApplication.status == "Offer").count()
    success_rate = (offers_count / jobs_count * 100) if jobs_count > 0 else 0
    
    return {
        "jobsTracked": jobs_count,
        "interviewsPrepped": interviews_count,
        "successRate": round(success_rate, 1)
    }

@app.get("/api/profile/resumes")
async def get_resumes(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    resumes = crud.get_user_resumes(db, current_user.id)
    return [
        {
            "id": resume.id,
            "name": resume.name,
            "is_active": resume.is_active,
            "created_at": resume.created_at
        }
        for resume in resumes
    ]

@app.get("/api/jobs")
async def get_job_applications(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    jobs = crud.get_user_job_applications(db, current_user.id)
    return [
        {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "status": job.status,
            "matchScore": job.match_score,
            "url": job.url,
            "created_at": job.created_at
        }
        for job in jobs
    ]

@app.get("/api/interviews/history")
async def get_interview_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = crud.get_user_interview_sessions(db, current_user.id)
    return [
        {
            "id": session.id,
            "mode": session.mode,
            "completed": session.completed,
            "job_title": session.job_application.title if session.job_application else None,
            "created_at": session.created_at
        }
        for session in sessions
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)