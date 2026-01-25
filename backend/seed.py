"""
Seed script to populate the database with sample job applications
Run this script after the application starts to populate test data
"""

from datetime import datetime, timedelta
from database import SessionLocal
from crud import create_user, create_job_application
from models import JobApplication

def seed_database():
    """Populate the database with sample data"""
    db = SessionLocal()
    
    try:
        # Create a test user
        test_user = create_user(
            db,
            email="test@example.com",
            name="John Doe",
            password="testpassword123"
        )
        print(f"✅ Created test user: {test_user.email}")
        
        # Sample job data
        jobs_data = [
            {
                "title": "Senior Python Developer",
                "company": "Google",
                "status": "Applied",
                "match_score": 85,
                "description": "We are looking for an experienced Python developer to join our team.",
                "url": "https://careers.google.com/jobs/results/",
            },
            {
                "title": "Full Stack Engineer",
                "company": "Microsoft",
                "status": "Interviewing",
                "match_score": 92,
                "description": "Help us build cloud solutions with modern technologies.",
                "url": "https://careers.microsoft.com/",
            },
            {
                "title": "Machine Learning Engineer",
                "company": "OpenAI",
                "status": "Applied",
                "match_score": 78,
                "description": "Work on cutting-edge AI models and research.",
                "url": "https://openai.com/careers/",
            },
            {
                "title": "Backend Engineer",
                "company": "Meta",
                "status": "Interviewing",
                "match_score": 88,
                "description": "Build scalable backend systems for billions of users.",
                "url": "https://metacareers.com/",
            },
            {
                "title": "DevOps Engineer",
                "company": "Amazon",
                "status": "Offer",
                "match_score": 91,
                "description": "Manage AWS infrastructure and build CI/CD pipelines.",
                "url": "https://www.amazon.jobs/",
            },
            {
                "title": "Frontend Developer",
                "company": "Apple",
                "status": "Rejected",
                "match_score": 70,
                "description": "Create amazing user experiences for billions of Apple users.",
                "url": "https://jobs.apple.com/",
            },
            {
                "title": "Data Engineer",
                "company": "Stripe",
                "status": "Applied",
                "match_score": 84,
                "description": "Build data infrastructure for payments platform.",
                "url": "https://stripe.com/jobs",
            },
            {
                "title": "Solutions Architect",
                "company": "Databricks",
                "status": "Interviewing",
                "match_score": 87,
                "description": "Help customers leverage the Lakehouse platform.",
                "url": "https://databricks.com/careers",
            },
        ]
        
        # Create job applications
        for job_data in jobs_data:
            status = job_data.pop("status")
            match_score = job_data.pop("match_score")
            
            job_app = create_job_application(
                db,
                user_id=test_user.id,
                **job_data
            )
            
            # Update status and match score
            job_app.status = status
            job_app.match_score = match_score
            db.add(job_app)
            
            print(f"✅ Created job: {job_data['title']} at {job_data['company']} - Status: {status}")
        
        db.commit()
        print("\n🎉 Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
