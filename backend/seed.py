"""
Seed script to populate the database with sample job applications
Run this script after the application starts to populate test data
"""

from datetime import datetime, timedelta
from database import SessionLocal
from crud import create_user, create_job_application, get_user_by_email
from models import JobApplication

def seed_database():
    """Populate the database with sample data"""
    db = SessionLocal()
    
    try:
        # Create or get test user
        test_user = get_user_by_email(db, "test@example.com")
        if not test_user:
            test_user = create_user(
                db,
                email="test@example.com",
                name="John Doe",
                password="testpassword123"
            )
            print(f"✅ Created test user: {test_user.email}")
        else:
            print(f"✅ Using existing test user: {test_user.email}")
        
        # Sample job data
        jobs_data = [
            {
                "title": "Senior Python Developer",
                "company": "Google",
                "status": "Upcoming",
                "interview_type": "technical",
                "location": "Remote",
                "salary_range": "$150k - $200k",
                "description": "We are looking for an experienced Python developer to join our team.",
                "url": "https://careers.google.com/jobs/results/",
                "requirements": ["5+ years Python experience", "Distributed systems knowledge", "Bachelor's in CS"],
                "responsibilities": ["Design scalable systems", "Code reviews", "Mentor junior engineers"],
                "technical_topics": ["System Design", "Python", "Distributed Systems", "Microservices"],
                "behavioral_topics": ["Leadership", "Conflict resolution", "Team collaboration"],
                "leetcode_topics": ["Arrays", "Hash Tables", "Dynamic Programming"],
            },
            {
                "title": "Full Stack Engineer",
                "company": "Microsoft",
                "status": "Upcoming",
                "interview_type": "both",
                "location": "Hybrid - Seattle",
                "salary_range": "$140k - $180k",
                "description": "Help us build cloud solutions with modern technologies.",
                "url": "https://careers.microsoft.com/",
                "requirements": ["React/TypeScript", "Node.js", "Azure experience"],
                "responsibilities": ["Build full-stack features", "API development", "Database design"],
                "technical_topics": ["React", "TypeScript", "Node.js", "REST APIs"],
                "behavioral_topics": ["Communication", "Problem solving"],
                "leetcode_topics": ["Trees", "Graphs", "Strings"],
            },
            {
                "title": "Machine Learning Engineer",
                "company": "OpenAI",
                "status": "Upcoming",
                "interview_type": "technical",
                "location": "San Francisco, CA",
                "salary_range": "$180k - $250k",
                "description": "Work on cutting-edge AI models and research.",
                "url": "https://openai.com/careers/",
                "requirements": ["ML/DL expertise", "Python/PyTorch", "PhD preferred"],
                "responsibilities": ["Train large models", "Research new architectures", "Deploy ML systems"],
                "technical_topics": ["Machine Learning", "Deep Learning", "Transformers", "PyTorch"],
                "behavioral_topics": ["Research collaboration", "Innovation"],
                "leetcode_topics": ["Math", "Matrices", "Optimization"],
            },
            {
                "title": "Backend Engineer",
                "company": "Meta",
                "status": "Upcoming",
                "interview_type": "both",
                "location": "Menlo Park, CA",
                "salary_range": "$160k - $220k",
                "description": "Build scalable backend systems for billions of users.",
                "url": "https://metacareers.com/",
                "requirements": ["Backend expertise", "Java/C++", "Large scale systems"],
                "responsibilities": ["Build APIs", "Optimize performance", "System design"],
                "technical_topics": ["System Architecture", "Databases", "Caching", "Load Balancing"],
                "behavioral_topics": ["Impact", "Trade-offs", "Decision making"],
                "leetcode_topics": ["Linked Lists", "Binary Search", "Sorting"],
            },
            {
                "title": "DevOps Engineer",
                "company": "Amazon",
                "status": "Completed",
                "interview_type": "technical",
                "location": "Remote",
                "salary_range": "$130k - $170k",
                "description": "Manage AWS infrastructure and build CI/CD pipelines.",
                "url": "https://www.amazon.jobs/",
                "requirements": ["AWS certification", "Terraform", "Docker/K8s"],
                "responsibilities": ["Manage infrastructure", "Build pipelines", "Monitor systems"],
                "technical_topics": ["AWS", "Kubernetes", "Terraform", "CI/CD"],
                "behavioral_topics": ["Ownership", "Customer obsession"],
                "leetcode_topics": ["Queues", "Stacks"],
            },
            {
                "title": "Frontend Developer",
                "company": "Apple",
                "status": "Completed",
                "interview_type": "both",
                "location": "Cupertino, CA",
                "salary_range": "$145k - $190k",
                "description": "Create amazing user experiences for billions of Apple users.",
                "url": "https://jobs.apple.com/",
                "requirements": ["React/Swift", "UI/UX design", "Performance optimization"],
                "responsibilities": ["Build UIs", "Optimize performance", "Accessibility"],
                "technical_topics": ["React", "JavaScript", "CSS", "Performance"],
                "behavioral_topics": ["Design thinking", "User focus"],
                "leetcode_topics": ["Strings", "Arrays"],
            },
            {
                "title": "Data Engineer",
                "company": "Stripe",
                "status": "Upcoming",
                "interview_type": "behavioral",
                "location": "Remote",
                "salary_range": "$155k - $195k",
                "description": "Build data infrastructure for payments platform.",
                "url": "https://stripe.com/jobs",
                "requirements": ["SQL/NoSQL", "Spark/Airflow", "Data modeling"],
                "responsibilities": ["Build data pipelines", "Data modeling", "ETL processes"],
                "technical_topics": ["Data Warehousing", "SQL", "Spark", "ETL"],
                "behavioral_topics": ["Collaboration", "Data quality"],
                "leetcode_topics": ["SQL queries", "Data structures"],
            },
            {
                "title": "Solutions Architect",
                "company": "Databricks",
                "status": "Upcoming",
                "interview_type": "behavioral",
                "location": "Remote",
                "salary_range": "$165k - $210k",
                "description": "Help customers leverage the Lakehouse platform.",
                "url": "https://databricks.com/careers",
                "requirements": ["Cloud platforms", "Data architecture", "Customer facing"],
                "responsibilities": ["Design solutions", "Customer presentations", "Technical consulting"],
                "technical_topics": ["Data Architecture", "Cloud", "Spark"],
                "behavioral_topics": ["Customer success", "Presentation skills", "Problem solving"],
                "leetcode_topics": [],
            },
        ]
        
        # Create job applications
        for job_data in jobs_data:
            status = job_data.pop("status")
            interview_type = job_data.pop("interview_type")
            location = job_data.pop("location", None)
            salary_range = job_data.pop("salary_range", None)
            requirements = job_data.pop("requirements", None)
            responsibilities = job_data.pop("responsibilities", None)
            technical_topics = job_data.pop("technical_topics", None)
            behavioral_topics = job_data.pop("behavioral_topics", None)
            leetcode_topics = job_data.pop("leetcode_topics", None)
            
            # Check if job already exists
            existing_job = db.query(JobApplication).filter(
                JobApplication.user_id == test_user.id,
                JobApplication.title == job_data["title"],
                JobApplication.company == job_data["company"]
            ).first()
            
            if existing_job:
                print(f"⏭️  Job already exists: {job_data['title']} at {job_data['company']}")
                continue
            
            job_app = create_job_application(
                db,
                user_id=test_user.id,
                **job_data
            )
            
            # Update status and all new fields
            job_app.status = status
            job_app.interview_type = interview_type
            job_app.location = location
            job_app.salary_range = salary_range
            job_app.requirements = requirements
            job_app.responsibilities = responsibilities
            job_app.technical_topics = technical_topics
            job_app.behavioral_topics = behavioral_topics
            job_app.leetcode_topics = leetcode_topics
            db.add(job_app)
            
            print(f"✅ Created job: {job_data['title']} at {job_data['company']} - Status: {status}, Type: {interview_type}")
        
        db.commit()
        print("\n🎉 Database seeding completed!")
        print("\n📝 Login credentials:")
        print("   Email: test@example.com")
        print("   Password: testpassword123")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()