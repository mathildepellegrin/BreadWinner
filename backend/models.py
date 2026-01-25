from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=True)  # Optional for now
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    resumes = relationship("Resume", back_populates="user")
    job_applications = relationship("JobApplication", back_populates="user")
    interview_sessions = relationship("InterviewSession", back_populates="user")

class Resume(Base):
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    content = Column(JSON, nullable=False)  # Structured resume data
    original_text = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="resumes")

class JobApplication(Base):
    __tablename__ = "job_applications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    requirements = Column(JSON, nullable=True)
    benefits = Column(JSON, nullable=True)
    url = Column(String, nullable=True)
    status = Column(String, default="Upcoming")  # Upcoming, Completed
    interview_type = Column(String, nullable=True)  # technical, behavioral, both
    location = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    responsibilities = Column(JSON, nullable=True)
    technical_topics = Column(JSON, nullable=True)
    behavioral_topics = Column(JSON, nullable=True)
    leetcode_topics = Column(JSON, nullable=True)
    gaps = Column(JSON, nullable=True)
    tailored_bullet_points = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="job_applications")
    interview_sessions = relationship("InterviewSession", back_populates="job_application")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_application_id = Column(Integer, ForeignKey("job_applications.id"), nullable=True)
    mode = Column(String, nullable=False)  # technical, behavioral, case
    session_type = Column(String, default="mock")  # mock, real-time-assistant
    conversation_history = Column(JSON, nullable=False, default=list)
    final_report = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    job_application = relationship("JobApplication", back_populates="interview_sessions")

# Add to backend/models.py

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # e.g., "Google"
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    questions = relationship("Question", back_populates="company")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    category = Column(String) # "leetcode", "technical", "behavioral"
    title = Column(String)    # e.g., "Two Sum"
    text = Column(Text)     # The actual question prompt
    leetcode_slug = Column(String, nullable=True) # e.g., "two-sum"
    ideal_answer = Column(Text)

    company = relationship("Company", back_populates="questions")