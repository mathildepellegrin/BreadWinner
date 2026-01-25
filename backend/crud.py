from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional, Dict, Any
from models import User, Resume, JobApplication, InterviewSession, Company, Question
from passlib.context import CryptContext
import hashlib

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# User CRUD
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, email: str, name: str, password: Optional[str] = None) -> User:
    password_hash = get_password_hash(password) if password else None
    user = User(email=email, name=name, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

# Resume CRUD
def create_resume(db: Session, user_id: int, name: str, content: Dict[str, Any], original_text: str = None) -> Resume:
    # Deactivate other resumes
    db.query(Resume).filter(Resume.user_id == user_id).update({"is_active": False})
    
    resume = Resume(
        user_id=user_id,
        name=name,
        content=content,
        original_text=original_text,
        is_active=True
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume

def get_user_resumes(db: Session, user_id: int) -> List[Resume]:
    return db.query(Resume).filter(Resume.user_id == user_id).order_by(desc(Resume.created_at)).all()

def get_active_resume(db: Session, user_id: int) -> Optional[Resume]:
    return db.query(Resume).filter(Resume.user_id == user_id, Resume.is_active == True).first()

# Job Application CRUD
def create_job_application(db: Session, user_id: int, title: str, company: str, 
                          description: str = None, requirements: List[str] = None, 
                          benefits: List[str] = None, url: str = None) -> JobApplication:
    job_app = JobApplication(
        user_id=user_id,
        title=title,
        company=company,
        description=description,
        requirements=requirements or [],
        benefits=benefits or [],
        url=url
    )
    db.add(job_app)
    db.commit()
    db.refresh(job_app)
    return job_app

def get_user_job_applications(db: Session, user_id: int) -> List[JobApplication]:
    return db.query(JobApplication).filter(JobApplication.user_id == user_id).order_by(desc(JobApplication.created_at)).all()

def get_job_application(db: Session, job_id: int, user_id: int) -> Optional[JobApplication]:
    return db.query(JobApplication).filter(JobApplication.id == job_id, JobApplication.user_id == user_id).first()

# Interview Session CRUD
def create_interview_session(db: Session, user_id: int, mode: str, job_application_id: int = None) -> InterviewSession:
    session = InterviewSession(
        user_id=user_id,
        job_application_id=job_application_id,
        mode=mode,
        conversation_history=[]
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def update_interview_session(db: Session, session_id: int, conversation_history: List[Dict], 
                           final_report: str = None, completed: bool = False) -> Optional[InterviewSession]:
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if session:
        session.conversation_history = conversation_history
        if final_report:
            session.final_report = final_report
        session.completed = completed
        db.commit()
        db.refresh(session)
    return session

def get_user_interview_sessions(db: Session, user_id: int) -> List[InterviewSession]:
    return db.query(InterviewSession).filter(InterviewSession.user_id == user_id).order_by(desc(InterviewSession.created_at)).all()

def get_interview_session(db: Session, session_id: int, user_id: int) -> Optional[InterviewSession]:
    return db.query(InterviewSession).filter(InterviewSession.id == session_id, InterviewSession.user_id == user_id).first()

# Company and Question CRUD
def get_company_by_name(db: Session, name: str) -> Optional[Company]:
    return db.query(Company).filter(Company.name.ilike(f"%{name}%")).first()

def create_company(db: Session, name: str) -> Company:
    company = Company(name=name)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

def create_question(db: Session, company_id: int, category: str, title: str, text: str, 
                   ideal_answer: str, leetcode_slug: str = None) -> Question:
    question = Question(
        company_id=company_id,
        category=category,
        title=title,
        text=text,
        leetcode_slug=leetcode_slug,
        ideal_answer=ideal_answer
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question