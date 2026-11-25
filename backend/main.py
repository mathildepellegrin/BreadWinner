import os
import uuid
import json
import base64
import requests
import jwt
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Body, Depends, Security, status, UploadFile, File
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field, validator
import logging
from sqlalchemy.orm import Session
from openai import OpenAI
from sqlalchemy import text
from database import SessionLocal, engine, get_db
from models import Base, User, Resume, JobApplication, InterviewSession, Company, Question
import crud
import hashlib
from firecrawl import FirecrawlApp
import io
import fitz # PyMuPDF
from docx import Document
from mangum import Mangum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

def run_migrations():
    """Check for missing columns and alter tables if necessary."""
    try:
        with engine.connect() as conn:
            # Check if 'score' column exists in 'interview_sessions'
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='score'"))
            if not result.fetchone():
                logger.info("Migration: Adding 'score' column to interview_sessions")
                conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN score INTEGER"))
                conn.commit()
            
            # Check for 'transcript' column (migration from conversation_history)
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='transcript'"))
            if not result.fetchone():
                logger.info("Migration: Adding 'transcript' column to interview_sessions")
                conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN transcript JSONB DEFAULT '[]'"))
                conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN feedback_report TEXT"))
                conn.commit()
            
            # Fix for legacy conversation_history not-null constraint
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='conversation_history'"))
            if result.fetchone():
                logger.info("Migration: Removing NOT NULL constraint from conversation_history")
                conn.execute(text("ALTER TABLE interview_sessions ALTER COLUMN conversation_history DROP NOT NULL"))
                conn.commit()
            
            # Check for 'job_application_id' column
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='interview_sessions' AND column_name='job_application_id'"))
            if not result.fetchone():
                logger.info("Migration: Adding 'job_application_id' column to interview_sessions")
                conn.execute(text("ALTER TABLE interview_sessions ADD COLUMN job_application_id INTEGER REFERENCES job_applications(id)"))
                conn.commit()
            
            # Check for 'phone' column in 'users' (Profile Migration)
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='phone'"))
            if not result.fetchone():
                logger.info("Migration: Adding profile columns to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50)"))
                conn.execute(text("ALTER TABLE users ADD COLUMN location VARCHAR(100)"))
                conn.execute(text("ALTER TABLE users ADD COLUMN linkedin VARCHAR(255)"))
                conn.execute(text("ALTER TABLE users ADD COLUMN portfolio VARCHAR(255)"))
                conn.execute(text("ALTER TABLE users ADD COLUMN summary TEXT"))
                conn.execute(text("ALTER TABLE users ADD COLUMN experience TEXT"))
                conn.execute(text("ALTER TABLE users ADD COLUMN education TEXT"))
                conn.execute(text("ALTER TABLE users ADD COLUMN skills TEXT"))
                conn.execute(text("ALTER TABLE users ADD COLUMN certifications TEXT"))
                conn.commit()
    except Exception as e:
        logger.error(f"Migration failed: {e}")

run_migrations()

# --- Configuration ---
class Settings:
    OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")  # Keep for backward compatibility
    ALLOWED_ORIGINS: List[str] = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
    MODEL_NAME: str = "google/gemini-2.0-flash-001"
    MAX_TEXT_LENGTH: int = 50000
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "hackathon-secret-key-2026")
    FIRECRAWL_API_KEY: str = os.environ.get("FIRECRAWL_API_KEY", "")
    HEYGEN_API_KEY: str = os.environ.get("HEYGEN_API_KEY", "")
    LIVEAVATAR_API_KEY: str = os.environ.get("LIVEAVATAR_API_KEY", "")
    LIVEAVATAR_AVATAR_ID: str = os.environ.get("LIVEAVATAR_AVATAR_ID", "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a")
    LIVEAVATAR_SANDBOX: bool = os.environ.get("LIVEAVATAR_SANDBOX", "false").lower() == "true"
    ELEVENLABS_API_KEY: str = os.environ.get("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")

settings = Settings()

# Initialize OpenRouter Client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY,
    default_headers={
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "BreadWinner AI",
    }
)

# Initialize Firecrawl Client
firecrawl_app = None
if settings.FIRECRAWL_API_KEY:
    firecrawl_app = FirecrawlApp(api_key=settings.FIRECRAWL_API_KEY)

# --- Pydantic Models ---
class LoginRequest(BaseModel):
    email: EmailStr
    password:str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

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

class JobStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Applied|Interviewing|Rejected|Offer)$")

class JobParseRequest(BaseModel):
    url: str

class JobCreateRequest(BaseModel):
    title: str
    company: str
    description: Optional[str] = ""
    requirements: List[str] = []
    benefits: List[str] = []
    url: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None

class PrepMaterialsRequest(BaseModel):
    job_id: int

class InterviewChatRequest(BaseModel):
    session_id: int
    user_answer_text: str

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2500)
    voice_id: Optional[str] = None
    output_format: str = Field(default="mp3", pattern="^(mp3|pcm_24000)$")

class InterviewSessionCreateRequest(BaseModel):
    job_id: Optional[int] = None
    mode: str = "technical"

class UserProfileUpdate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    skills: Optional[str] = None
    certifications: Optional[str] = None

# --- Security ---
security = HTTPBearer()

def create_token(user_id: int) -> str:
    """Create a JWT token"""
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify bearer token and return user_id"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return int(payload.get("sub"))
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

async def get_current_user(user_id: int = Depends(verify_token), db: Session = Depends(get_db)) -> User:
    """Get current authenticated user"""
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

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
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---
def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract text from PDF, DOCX, or TXT files"""
    text = ""
    try:
        if filename.lower().endswith(".pdf"):
            with fitz.open(stream=file_content, filetype="pdf") as doc:
                for page in doc:
                    text += page.get_text()
        elif filename.lower().endswith(".docx"):
            doc = Document(io.BytesIO(file_content))
            text = "\n".join([para.text for para in doc.paragraphs])
        elif filename.lower().endswith(".txt"):
            text = file_content.decode("utf-8")
    except Exception as e:
        logger.error(f"Error extracting text from {filename}: {e}")
        raise e
    return text

# --- Helper Functions ---
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
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "model": settings.MODEL_NAME,
        "api_key_configured": bool(settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY)
    }

@app.post("/api/auth/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """
    Signup endpoint - creates new user
    """
    # Check if user exists
    db_user = crud.get_user_by_email(db, email=request.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = crud.create_user(db=db, email=request.email, name=request.name, password=request.password)
    
    token = create_token(user.id)
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "token": token
    }

# UPDATE THE LOGIN ENDPOINT
@app.post("/api/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint - validates credentials
    """
    user = crud.get_user_by_email(db, request.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password exists and matches
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    if user.password_hash != password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_token(user.id)
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "token": token
    }

@app.get("/api/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's full profile"""
    # Raw SQL to get all columns including new ones not in ORM
    result = db.execute(
        text("SELECT id, email, name, phone, location, linkedin, portfolio, summary, experience, education, skills, certifications FROM users WHERE id = :uid"),
        {"uid": current_user.id}
    ).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "id": result.id,
        "email": result.email,
        "name": result.name,
        "phone": result.phone,
        "location": result.location,
        "linkedin": result.linkedin,
        "portfolio": result.portfolio,
        "summary": result.summary,
        "experience": result.experience,
        "education": result.education,
        "skills": result.skills,
        "certifications": result.certifications
    }

@app.put("/api/profile")
async def update_profile(
    profile: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile details"""
    # Update using raw SQL
    query = text("""
        UPDATE users 
        SET name=:name, email=:email, phone=:phone, location=:location, 
            linkedin=:linkedin, portfolio=:portfolio, summary=:summary, 
            experience=:experience, education=:education, skills=:skills, 
            certifications=:certifications
        WHERE id=:uid
    """)
    db.execute(query, {
        "name": profile.name,
        "email": profile.email,
        "phone": profile.phone,
        "location": profile.location,
        "linkedin": profile.linkedin,
        "portfolio": profile.portfolio,
        "summary": profile.summary,
        "experience": profile.experience,
        "education": profile.education,
        "skills": profile.skills,
        "certifications": profile.certifications,
        "uid": current_user.id
    })
    db.commit()
    return {"message": "Profile updated successfully"}

@app.post("/api/profile/upload-cv")
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload CV (PDF/DOCX), parse with AI, and save to database"""
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")

    # 1. Read and Extract Text
    try:
        content = await file.read()
        cv_text = extract_text_from_file(content, file.filename)
    except Exception as e:
        logger.error(f"CV Upload processing error: {e}")
        raise HTTPException(status_code=400, detail=f"File processing failed: {str(e)}")
    
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file. Please try a different format.")

    # 2. Parse with AI
    prompt = f"""
    Convert this raw CV text into a structured JSON profile including: 
    name, email, phone, location, linkedin, portfolio, summary, 
    education (array of strings or objects), experience (array of strings or objects), 
    skills (array of strings), and certifications (array of strings).
    
    Ensure the keys match exactly these names.
    
    Raw CV:
    {cv_text[:settings.MAX_TEXT_LENGTH]}
    """
    
    parsed_data = await safe_generate_json(prompt)
    
    # 3. Manage Active Resume State
    # Deactivate old resumes for this user
    db.execute(text("UPDATE resumes SET is_active = false WHERE user_id = :uid"), {"uid": current_user.id})
    db.commit()
    
    # 4. Save to Database
    crud.create_resume(db, current_user.id, file.filename, parsed_data, cv_text)
    
    # 5. Return Data to Frontend (to populate form)
    return parsed_data

# --- Company Questions Cache ---
@app.get("/api/prep/company/{company_name}")
async def get_company_prep(
    company_name: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Check cache for company questions; generate via AI if not found."""
    # Configuration - easily changeable later
    QUESTIONS_PER_CATEGORY = 1  # Change to 5 later
    
    try:
        company = crud.get_company_by_name(db, company_name)
        
        if company and company.questions:
            logger.info(f"Cache Hit for {company_name}")
            questions_data = [
                {
                    "id": q.id,
                    "category": q.category,
                    "title": q.title,
                    "text": q.text,
                    "leetcode_slug": q.leetcode_slug,
                    "ideal_answer": q.ideal_answer
                }
                for q in company.questions
            ]
            return {
                "company": company.name,
                "questions": questions_data,
                "cached": True,
                "generated_at": company.last_updated.isoformat() if company.last_updated else None
            }

        logger.info(f"Cache Miss for {company_name}. Generating new questions...")
        
        if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
            # Return mock data if AI not configured
            return {
                "company": company_name,
                "questions": [
                    {
                        "id": 1,
                        "category": "leetcode",
                        "title": "Two Sum",
                        "text": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                        "leetcode_slug": "two-sum",
                        "ideal_answer": "Use hashmap to store complements. Time: O(n), Space: O(n)"
                    },
                    {
                        "id": 2,
                        "category": "technical",
                        "title": "System Design",
                        "text": f"How would you design a scalable system at {company_name}?",
                        "leetcode_slug": None,
                        "ideal_answer": "Consider microservices, load balancing, and database optimization."
                    },
                    {
                        "id": 3,
                        "category": "behavioral",
                        "title": "Team Collaboration",
                        "text": "Tell me about a time when you had to work with a difficult team member.",
                        "leetcode_slug": None,
                        "ideal_answer": "Use STAR method: Situation, Task, Action, Result."
                    }
                ],
                "cached": False,
                "generated_at": datetime.now().isoformat(),
                "note": "Mock data - AI service not configured"
            }
        
        # AI Generation logic would go here
        prompt = f"""
        Generate {QUESTIONS_PER_CATEGORY * 3} interview questions for {company_name}. 
        Create exactly {QUESTIONS_PER_CATEGORY} question(s) for each category: 'leetcode', 'technical', 'behavioral'.
        
        Return JSON with questions array.
        """
        
        ai_data = await safe_generate_json(prompt)
        
        # Create company if doesn't exist
        if not company:
            company = crud.create_company(db, company_name.capitalize())
        
        # Save questions to database
        for q in ai_data.get('questions', []):
            crud.create_question(
                db, company.id,
                q['category'],
                q['title'], 
                q['text'],
                q['ideal_answer'],
                q.get('leetcode_slug')
            )
        
        # Refresh to get questions with IDs
        db.refresh(company)
        
        questions_data = [
            {
                "id": q.id,
                "category": q.category,
                "title": q.title,
                "text": q.text,
                "leetcode_slug": q.leetcode_slug,
                "ideal_answer": q.ideal_answer
            }
            for q in company.questions
        ]
        
        return {
            "company": company.name,
            "questions": questions_data,
            "cached": False,
            "generated_at": company.last_updated.isoformat() if company.last_updated else None
        }
        
    except Exception as e:
        logger.error(f"Error in company prep for {company_name}: {e}")
        # Return fallback response
        return {
            "company": company_name,
            "questions": [
                {
                    "id": 1,
                    "category": "leetcode",
                    "title": "Array Problem",
                    "text": "Solve a common array manipulation problem.",
                    "leetcode_slug": None,
                    "ideal_answer": "Focus on time and space complexity."
                }
            ],
            "cached": False,
            "generated_at": datetime.now().isoformat(),
            "error": "Fallback data due to service error"
        }

# --- Protected Routes ---
@app.post("/api/profile/parse")
async def parse_resume(
    request: ResumeParseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parse resume text into structured JSON format"""
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")
    
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
    
    parsed_data = await safe_generate_json(prompt)
    
    # Save resume to database
    resume_name = f"Resume_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    resume = crud.create_resume(db, current_user.id, resume_name, parsed_data, request.text)
    
    return {
        "id": resume.id,
        "name": resume.name,
        "data": parsed_data,
        "created_at": resume.created_at
    }

@app.post("/api/jobs/parse")
async def parse_job_details(request: JobParseRequest):
    """Parse job details from URL without saving"""
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    prompt = f"""
    Extract job information from the following URL context.
    Return JSON with: 
    - title
    - company
    - description
    - requirements (array of strings)
    - benefits (array of strings)
    - location
    - salary_range
    
    URL: {request.url}
    """
    
    return await safe_generate_json(prompt)

@app.post("/api/jobs/auto-fill")
async def auto_fill_job(request: JobParseRequest):
    """Auto-fill job details using Firecrawl for scraping and AI for parsing"""
    if not firecrawl_app:
        raise HTTPException(status_code=503, detail="Firecrawl service not configured")
    
    try:
        # Scrape the URL
        scrape_result = None
        if hasattr(firecrawl_app, 'scrape_url'):
            try:
                scrape_result = firecrawl_app.scrape_url(request.url, params={'formats': ['markdown']})
            except TypeError:
                pass
        
        if scrape_result is None and hasattr(firecrawl_app, 'scrape'):
            try:
                scrape_result = firecrawl_app.scrape(request.url, params={'formats': ['markdown']})
            except TypeError:
                scrape_result = firecrawl_app.scrape(request.url)

        if scrape_result is None:
            raise HTTPException(status_code=500, detail="Firecrawl client configuration error: method not found")
            
        markdown_content = scrape_result.get('markdown', '') if isinstance(scrape_result, dict) else str(scrape_result)
        
        if not markdown_content:
            raise HTTPException(status_code=400, detail="Failed to scrape content from URL")
            
        prompt = f"""
        Extract job information from the following job posting content.
        Return JSON with: 
        - title
        - company
        - description
        - requirements (array of strings)
        - benefits (array of strings)
        - location
        - salary_range
        
        Content:
        {markdown_content[:settings.MAX_TEXT_LENGTH]}
        """
        
        return await safe_generate_json(prompt)
    except Exception as e:
        logger.error(f"Auto-fill failed: {e}")
        raise HTTPException(status_code=500, detail=f"Auto-fill failed: {str(e)}")

@app.post("/api/jobs")
async def create_job(
    request: JobCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new job application manually"""
    # Note: We are passing fields supported by the current CRUD. 
    # If you updated crud.py to support location/salary, add them here.
    job_app = crud.create_job_application(
        db=db,
        user_id=current_user.id,
        title=request.title,
        company=request.company,
        description=request.description,
        requirements=request.requirements,
        benefits=request.benefits,
        url=request.url
    )
    
    return {
        "id": job_app.id,
        "title": job_app.title,
        "company": job_app.company,
        "status": job_app.status,
        "url": job_app.url,
        "created_at": job_app.created_at
    }

@app.post("/api/jobs/ingest")
async def ingest_job(
    request: JobIngestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ingest job description and save to database"""
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")
    
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
        job_data = await safe_generate_json(prompt)
        
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
        analysis = await safe_generate_json(prompt)
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate interview question with feedback"""
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    # Fetch active resume to provide better context
    resume = crud.get_active_resume(db, current_user.id)
    candidate_profile = request.profile
    if resume:
        candidate_profile = resume.content

    prompt = f"""
    You are an expert {request.mode} interviewer for: {request.jd.get('title', 'Position')} at {request.jd.get('company', 'Company')}.
    
    Candidate Profile Summary:
    {json.dumps(candidate_profile, indent=2)[:1500]}
    
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
    
    return await safe_generate_json(prompt)

@app.get("/api/interviews/token")
async def get_liveavatar_token(
    sandbox: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    """Fetch HeyGen LiveAvatar LITE session token, falling back cleanly to voice-only if unavailable"""
    if not settings.LIVEAVATAR_API_KEY:
        return {"mode": "voice_only", "reason": "LiveAvatar API key not configured"}

    use_sandbox = settings.LIVEAVATAR_SANDBOX if sandbox is None else sandbox
    payload = {
        "mode": "LITE",
        "avatar_id": settings.LIVEAVATAR_AVATAR_ID,
        "is_sandbox": use_sandbox,
    }
    try:
        response = requests.post(
            "https://api.liveavatar.com/v1/sessions/token",
            headers={
                "X-API-KEY": settings.LIVEAVATAR_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=payload,
            timeout=15,
        )
        data = response.json() if response.content else {}
        session_token = (data.get("data") or {}).get("session_token")
        session_id = (data.get("data") or {}).get("session_id")
        if response.ok and session_token:
            return {
                "mode": "liveavatar",
                "session_token": session_token,
                "session_id": session_id,
                "is_sandbox": use_sandbox,
            }

        logger.warning(f"LiveAvatar token unavailable (status={response.status_code}): {data}")
        return {
            "mode": "voice_only",
            "reason": data.get("message") or f"LiveAvatar unavailable (HTTP {response.status_code})",
        }
    except Exception as e:
        logger.error(f"LiveAvatar token fetch failed: {e}")
        return {"mode": "voice_only", "reason": "LiveAvatar temporarily unavailable"}

@app.post("/api/interviews/tts")
async def synthesize_speech(
    request: TTSRequest,
    current_user: User = Depends(get_current_user)
):
    """Synthesize AI interviewer voice using ElevenLabs TTS (MP3 for voice-only or PCM 24kHz for LiveAvatar LITE)"""
    if not settings.ELEVENLABS_API_KEY:
        raise HTTPException(status_code=503, detail="ElevenLabs API key not configured")

    voice_id = request.voice_id or settings.ELEVENLABS_VOICE_ID
    is_pcm = request.output_format == "pcm_24000"
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=pcm_24000"
        if is_pcm
        else f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    )
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    if not is_pcm:
        headers["Accept"] = "audio/mpeg"

    try:
        response = requests.post(
            url,
            headers=headers,
            json={
                "text": request.text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75,
                },
            },
            timeout=30,
        )
        response.raise_for_status()
        if is_pcm:
            pcm_bytes = response.content
            # Pad to multiple of 6 bytes (3 samples * 2 bytes) so 960-char base64 chunks stay aligned
            rem = len(pcm_bytes) % 6
            if rem:
                pcm_bytes += b"\x00" * (6 - rem)
            return {
                "audio_base64": base64.b64encode(pcm_bytes).decode("ascii"),
                "format": "pcm_24000",
            }
        return Response(content=response.content, media_type="audio/mpeg")
    except requests.exceptions.HTTPError as e:
        logger.error(f"ElevenLabs TTS failed: Status {e.response.status_code}, Response: {e.response.text}")
        raise HTTPException(status_code=502, detail="ElevenLabs TTS generation failed")
    except Exception as e:
        logger.error(f"ElevenLabs TTS error: {e}")
        raise HTTPException(status_code=500, detail="Failed to synthesize speech")

@app.post("/api/interviews/chat")
async def chat_simulation(
    request: InterviewChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dynamic Interview Simulation Engine"""
    session = db.query(InterviewSession).filter(InterviewSession.id == request.session_id, InterviewSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # 1. Update transcript with user answer
    history = list(session.transcript or [])
    if not history or history[-1]['role'] == 'assistant':
        history.append({"role": "user", "content": request.user_answer_text})
    
    # 2. AI Analysis
    job = session.job_application
    company_name = job.company if job else "the company"
    job_title = job.title if job else "Software Engineer"
    
    prompt = f"""
    You are an expert interviewer for {company_name} hiring a {job_title}.
    Mode: {session.mode}
    
    Conversation History:
    {json.dumps(history[-4:], indent=2)}
    
    User's Last Answer: "{request.user_answer_text}"
    
    Task:
    1. Evaluate the user's answer (Score 1-10).
    2. If score < 7 or answer is vague: Set action="DRILL_DOWN". Generate a specific follow-up question.
    3. If score >= 7: Set action="NEXT".
    
    Return JSON:
    {{
        "score": 8,
        "action": "NEXT" or "DRILL_DOWN",
        "question": "The next question text (if drill down)"
    }}
    """
    
    analysis = await safe_generate_json(prompt)
    next_question_text = ""
    
    if analysis.get("action") == "DRILL_DOWN":
        next_question_text = analysis.get("question")
    else:
        # Fetch next question from cache
        company = crud.get_company_by_name(db, company_name)
        cached_questions = company.questions if company else []
        
        # Filter out already asked questions
        asked_texts = [h['content'] for h in history if h['role'] == 'assistant']
        available_questions = [
            q for q in cached_questions 
            if q.text not in asked_texts and (q.category == session.mode or session.mode == "mock")
        ]
        
        if available_questions:
            next_question_text = available_questions[0].text
        else:
            # Generate generic next question if cache exhausted
            gen_prompt = f"Generate a challenging {session.mode} interview question for {job_title} at {company_name}."
            gen_res = await safe_generate_json(f'Return JSON {{"question": "..."}} based on: {gen_prompt}')
            next_question_text = gen_res.get("question")

    if not next_question_text:
        next_question_text = "Could you walk me through a challenging technical project you worked on recently?"

    # 3. Update transcript with AI question
    history.append({"role": "assistant", "content": next_question_text})
    
    # 4. Save to DB (Direct update to avoid crud dependency issues with renamed fields)
    session.transcript = history
    db.commit()
    db.refresh(session)
    
    return {"next_question_text": next_question_text}

@app.post("/api/interviews/sessions")
async def create_interview_session_endpoint(
    request: InterviewSessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new interview session"""
    # Direct creation to ensure transcript field is used
    session = InterviewSession(
        user_id=current_user.id,
        mode=request.mode,
        transcript=[]
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Manually update job_application_id to ensure it is saved even if the ORM model is outdated
    if request.job_id:
        db.execute(
            text("UPDATE interview_sessions SET job_application_id = :job_id WHERE id = :id"),
            {"job_id": request.job_id, "id": session.id}
        )
        db.commit()
        
    return {"session_id": session.id}

@app.post("/api/interviews/sessions/{session_id}/complete")
async def complete_interview_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an interview session as completed"""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id,
        InterviewSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.completed = True
    db.commit()
    db.refresh(session)
    
    return {
        "message": "Session marked as completed",
        "session_id": session.id,
        "transcript": session.transcript
    }

@app.post("/api/interviews/report")
async def get_report(
    request: InterviewReportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate comprehensive interview feedback report"""
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    prompt = f"""
    Generate a detailed interview performance report.
    
    Role: {request.jd.get('title', 'Position')} at {request.jd.get('company', 'Company')}
    
    Interview Transcript:
    {json.dumps(request.history, indent=2)}
    
    Provide:
    1. Overall performance rating (1-10)
    2. Strengths demonstrated
    3. Areas for improvement (Technical & Communication)
    4. Actionable recommendations
    5. Final Score (0-100)
    
    Return JSON:
    {{
        "report_markdown": "full markdown report...",
        "score": 85
    }}
    """
    
    try:
        result = await safe_generate_json(prompt)
        
        # Try to find the session if possible, otherwise just return report
        # Ideally request should have session_id. 
        # For now, we return the data.
        
        return {
            "report": result.get("report_markdown"),
            "score": result.get("score")
        }
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        # Fallback
        return {
            "report": "## Interview Feedback\n\nAnalysis failed. Please try again.",
            "score": 0
        }

@app.post("/api/prep/materials")
async def get_prep(
    request: PrepMaterialsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate interview preparation materials (Study Lab)"""
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        # Return generic fallback data so the UI isn't empty if AI is not configured
        return {
            "technical_topics": ["System Design", "Scalability", "API Design", "Database Normalization", "Microservices"],
            "behavioral_topics": ["Conflict Resolution", "Leadership", "Project Management", "Adaptability", "Communication"],
            "leetcode_topics": ["Arrays & Hashing", "Two Pointers", "Sliding Window", "Trees & Graphs", "Dynamic Programming"]
        }
    
    job = crud.get_job_application(db, request.job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    # Make resume optional - generate based on JD if no resume exists
    resume = crud.get_active_resume(db, current_user.id)
    resume_content = json.dumps(resume.content) if resume else "No resume provided. Focus on the job description."

    prompt = f"""
    Generate Study Lab materials for: {job.title} at {job.company}.
    
    Job Description: {job.description}
    Candidate Resume: {resume_content}
    
    Return JSON with these exact keys containing arrays of 5 strings each:
    {{
        "technical_topics": ["topic1", ...],
        "behavioral_topics": ["topic1", ...],
        "leetcode_topics": ["topic1", ...]
    }}
    """
    
    return await safe_generate_json(prompt)

# --- Error Handlers ---
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )

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
async def get_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's resumes"""
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
async def get_job_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's job applications"""
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

@app.get("/api/jobs/{job_id}")
async def get_job_detail(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific job application"""
    job = crud.get_job_application(db, job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "requirements": job.requirements,
        "benefits": job.benefits,
        "status": job.status,
        "url": job.url,
        "created_at": job.created_at,
        # Safely access potentially missing fields if schema isn't fully updated
        "location": getattr(job, "location", None),
        "salary": getattr(job, "salary", None)
    }

@app.get("/api/interviews/history")
async def get_interview_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's interview history with transcripts"""
    # Use raw SQL to fetch history with job details to avoid ORM relationship issues
    query = text("""
        SELECT 
            s.id, s.mode, s.completed, s.created_at, s.transcript,
            j.title as job_title, j.company
        FROM interview_sessions s
        LEFT JOIN job_applications j ON s.job_application_id = j.id
        WHERE s.user_id = :user_id
        ORDER BY s.created_at DESC
    """)
    
    result = db.execute(query, {"user_id": current_user.id}).fetchall()
    
    return [{
        "id": row.id,
        "mode": row.mode,
        "completed": row.completed,
        "job_title": row.job_title,
        "company": row.company,
        "created_at": row.created_at,
        "transcript": row.transcript
    } for row in result]

# Handler for AWS Lambda
handler = Mangum(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")