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
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from database import SessionLocal, engine, get_db
from models import Base, User, Resume, JobApplication, InterviewSession, Company, Question
import crud

# Load environment variables from .env file
load_dotenv()

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

# --- Pydantic Models ---
class LoginRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = None

class ResumeParseRequest(BaseModel):
    text: str = Field(..., max_length=settings.MAX_TEXT_LENGTH)
    
class JobIngestRequest(BaseModel):
    url: Optional[str] = None
    description: Optional[str] = Field(None, max_length=settings.MAX_TEXT_LENGTH)
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    requirements: Optional[str] = None  # Will be split by newlines
    responsibilities: Optional[str] = None  # Will be split by newlines
    benefits: Optional[str] = None  # Will be split by newlines
    interview_type: Optional[str] = Field(None, pattern="^(technical|behavioral|both)$")
    
    @validator('url', 'description')
    def validate_input(cls, v, values):
        # Allow manual form submission without url or description
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
    status: str = Field(..., pattern="^(Upcoming|Completed)$")

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

def scrape_job_posting(url: str) -> str:
    """Scrape job posting content from URL using requests and BeautifulSoup"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        logger.info(f"Attempting to scrape URL: {url}")
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
        
        logger.info(f"Response status: {response.status_code}, Content length: {len(response.content)}")
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header", "iframe", "noscript"]):
            script.decompose()
        
        # Get text content
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Check if we got meaningful content
        if len(text) < 100:
            logger.warning(f"Scraped content is too short ({len(text)} chars), might be blocked or invalid page")
            raise HTTPException(
                status_code=400, 
                detail="Could not extract meaningful content from the URL. Please ensure it's a direct job posting link."
            )
        
        # Limit text length
        if len(text) > settings.MAX_TEXT_LENGTH:
            text = text[:settings.MAX_TEXT_LENGTH]
        
        logger.info(f"Successfully scraped {len(text)} characters from {url}")
        return text
    except requests.exceptions.Timeout:
        logger.error(f"Timeout while scraping {url}")
        raise HTTPException(status_code=408, detail="Request timeout. The website took too long to respond.")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed for {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to scrape URL {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to scrape job posting: {str(e)}")

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

@app.post("/api/auth/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login endpoint - creates user if doesn't exist
    """
    user = crud.get_user_by_email(db, request.email)
    if not user:
        # Create new user
        name = request.email.split('@')[0].capitalize()
        user = crud.create_user(db, request.email, name, request.password)
    
    token = create_token(user.id)
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "token": token
    }

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

@app.post("/api/jobs/test-scrape")
async def test_scrape(request: Dict[str, str] = Body(...)):
    """Test endpoint to debug web scraping - NO AUTH REQUIRED"""
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    logger.info(f"TEST SCRAPE request for URL: {url}")
    
    try:
        # Test just the scraping part
        scraped_content = scrape_job_posting(url)
        return {
            "success": True,
            "url": url,
            "contentLength": len(scraped_content),
            "preview": scraped_content[:500] + "..." if len(scraped_content) > 500 else scraped_content
        }
    except Exception as e:
        logger.error(f"Test scrape failed: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "errorType": type(e).__name__
        }

@app.post("/api/jobs/autofill")
async def autofill_job(
    request: Dict[str, str] = Body(...),
    current_user: User = Depends(get_current_user)
):
    """Auto-fill job details from URL using web scraping and AI"""
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    logger.info(f"Auto-fill request for URL: {url}")
    
    if not (settings.OPENROUTER_API_KEY or settings.GEMINI_API_KEY):
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    try:
        # Scrape the job posting
        logger.info("Starting web scraping...")
        scraped_content = scrape_job_posting(url)
        logger.info(f"Scraping complete. Content length: {len(scraped_content)}")
        
        # Use AI to parse and structure the data
        logger.info("Sending to AI for parsing...")
        prompt = f"""
        You are a job posting parser. Extract and structure the following information from this job posting.
        Return a valid JSON object with these exact fields:
        - title: The job title/position name
        - company: The company name
        - location: The job location (e.g., "Remote", "New York, NY", "Hybrid - Seattle")
        - salaryRange: The salary range if mentioned (e.g., "$120k - $180k"), empty string if not found
        - description: A brief 2-3 sentence description of the role
        - requirements: An array of key requirements/qualifications (5-10 items)
        - responsibilities: An array of main job responsibilities (5-10 items)
        - benefits: An array of benefits/perks mentioned (3-8 items), empty array if none found
        - interviewType: Based on the job description, determine if this is likely "technical", "behavioral", or "both"
        
        Job Posting Content:
        {scraped_content}
        
        Return ONLY valid JSON, no additional text.
        """
        
        job_data = await safe_generate_json(prompt)
        
        # Handle case where AI returns a list instead of dict
        if isinstance(job_data, list):
            logger.warning(f"AI returned a list with {len(job_data)} items, taking first item")
            if len(job_data) > 0:
                job_data = job_data[0]
            else:
                raise ValueError("AI returned an empty list")
        
        logger.info(f"AI returned data type: {type(job_data)}")
        logger.info(f"AI parsing complete. Extracted: {job_data.get('title', 'N/A')} at {job_data.get('company', 'N/A')}")
        
        # Format the data for the frontend
        result = {
            "title": job_data.get("title", ""),
            "company": job_data.get("company", ""),
            "location": job_data.get("location", ""),
            "salaryRange": job_data.get("salaryRange", ""),
            "description": job_data.get("description", ""),
            "requirements": "\n".join(job_data.get("requirements", [])),
            "responsibilities": "\n".join(job_data.get("responsibilities", [])),
            "benefits": "\n".join(job_data.get("benefits", [])),
            "interviewType": job_data.get("interviewType", "technical")
        }
        
        logger.info("Auto-fill successful")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auto-fill failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to auto-fill: {str(e)}")

@app.post("/api/jobs/ingest")
async def ingest_job(
    request: JobIngestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ingest job description and save to database"""
    
    # If manual form data is provided (has title and company), use it directly
    if request.title and request.company:
        # Parse text fields that have newline-separated items
        requirements_list = [r.strip() for r in request.requirements.split('\n') if r.strip()] if request.requirements else []
        responsibilities_list = [r.strip() for r in request.responsibilities.split('\n') if r.strip()] if request.responsibilities else []
        benefits_list = [b.strip() for b in request.benefits.split('\n') if b.strip()] if request.benefits else []
        
        job_app = crud.create_job_application(
            db=db,
            user_id=current_user.id,
            title=request.title,
            company=request.company,
            description=request.description or "",
            requirements=requirements_list,
            responsibilities=responsibilities_list,
            benefits=benefits_list,
            url=request.url,
            location=request.location,
            salary_range=request.salary_range,
            interview_type=request.interview_type or "technical"
        )
        
        return {
            "id": job_app.id,
            "title": job_app.title,
            "company": job_app.company,
            "status": job_app.status,
            "interviewType": job_app.interview_type,
            "location": job_app.location,
            "salaryRange": job_app.salary_range,
            "url": job_app.url
        }
    
    # Otherwise, use AI to extract from URL or description
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
    """Get gap analysis for a job"""
    job = crud.get_job_application(db, job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.gaps:
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
            "gaps": ["missing skill 1", "missing skill 2"],
            "strengths": ["matched skill 1"]
        }}
        """
        analysis = await safe_generate_json(prompt)
        job.gaps = analysis.get("gaps")
        db.commit()
        db.refresh(job)
        return analysis
        
    return {
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
    return {
        "error": exc.detail,
        "status_code": exc.status_code
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
            "interviewType": job.interview_type,
            "url": job.url,
            "location": job.location,
            "salaryRange": job.salary_range,
            "created_at": job.created_at
        }
        for job in jobs
    ]

@app.get("/api/jobs/{job_id}")
async def get_job_application_by_id(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single job application by ID"""
    job = crud.get_job_application(db, job_id, current_user.id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "status": job.status,
        "interviewType": job.interview_type,
        "url": job.url,
        "location": job.location,
        "salaryRange": job.salary_range,
        "description": job.description,
        "requirements": job.requirements,
        "responsibilities": job.responsibilities,
        "benefits": job.benefits,
        "technicalTopics": job.technical_topics,
        "behavioralTopics": job.behavioral_topics,
        "leetcodeTopics": job.leetcode_topics,
        "created_at": job.created_at
    }

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
            "created_at": session.created_at
        }
        for session in sessions
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")