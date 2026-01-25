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
from database import SessionLocal, engine, get_db
from models import Base, User, Resume, JobApplication, InterviewSession, Company, Question
import crud
import hashlib
from firecrawl import FirecrawlApp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# --- Configuration ---
class Settings:
    OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")  # Keep for backward compatibility
    ALLOWED_ORIGINS: List[str] = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    MODEL_NAME: str = "google/gemini-2.0-flash-001"
    MAX_TEXT_LENGTH: int = 50000
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "hackathon-secret-key-2026")
    FIRECRAWL_API_KEY: str = os.environ.get("FIRECRAWL_API_KEY", "")

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

# --- Security ---
security = HTTPBearer()

# Simple token store (in production, use Redis or a database)
valid_tokens = {}  # token -> user_id mapping

def create_token(user_id: int) -> str:
    """Create a simple bearer token (in production, use JWT)"""
    token = str(uuid.uuid4())
    valid_tokens[token] = user_id
    return token

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify bearer token and return user_id"""
    token = credentials.credentials
    if token not in valid_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return valid_tokens[token]

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
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

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
# --- Company Questions Cache ---
@app.get("/api/prep/company/{company_name}")
async def get_company_prep(
    company_name: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Check cache for company questions; generate via AI if not found."""
    try:
        # Configuration - easily changeable later
        QUESTIONS_PER_CATEGORY = 1  # Change to 5 later
        
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
        
        # Return mock data for now
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
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in company prep for {company_name}: {e}")
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
            "error": "Fallback data"
        }

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
    
    return await safe_generate_json(prompt)

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
    3. Areas for improvement
    4. Specific examples from the interview
    5. Actionable recommendations
    
    Format as markdown.
    """
    
    try:
        response = client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=[{"role": "user", "content": prompt}]
        )
        return {"report": response.choices[0].message.content}
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
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    job = crud.get_job_application(db, request.job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    resume = crud.get_active_resume(db, current_user.id)
    if not resume:
        raise HTTPException(status_code=400, detail="Active resume required")

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

@app.get("/api/interviews/history")
async def get_interview_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's interview history"""
    sessions = crud.get_user_interview_sessions(db, current_user.id)
    return [
        {
            "id": session.id,
            "mode": session.mode,
            "completed": session.completed,
            "job_title": session.job_application.title if session.job_application else None,
            "company": session.job_application.company if session.job_application else None,
            "created_at": session.created_at
        }
        for session in sessions
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")