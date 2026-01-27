# BreadWinner AI 🍞

BreadWinner is an AI-powered interview preparation and job tracking platform. It helps users practice with realistic AI interviewers, optimize their resumes, and manage their job search process efficiently.

## 🚀 Features

- **AI Interview Simulations**: Real-time video and voice interviews with an interactive AI avatar (powered by HeyGen & OpenAI).
- **Smart Resume Parsing**: Upload PDF/DOCX resumes to automatically extract and structure professional details.
- **Job Application Tracking**: Kanban-style or list view of job applications with status updates.
- **Gap Analysis**: AI-driven comparison between your resume and job descriptions to identify missing skills.
- **Study Lab**: Personalized interview preparation materials generated based on specific job roles.

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: SQLAlchemy
- **AI Models**: OpenAI / Google Gemini (via OpenRouter)
- **Services**: 
  - **HeyGen**: Streaming Avatar SDK for video interviews.
  - **Firecrawl**: Web scraping for job descriptions.
- **Deployment**: AWS Lambda (Docker container via ECR).

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: AWS Amplify

## 📦 Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js & npm
- Docker (for deployment)

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with the following variables:
```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
OPENROUTER_API_KEY=your_key
GEMINI_API_KEY=your_key
HEYGEN_API_KEY=your_key
FIRECRAWL_API_KEY=your_key
JWT_SECRET=your_secret
ALLOWED_ORIGINS=*
```

Run the local server:
```bash
uvicorn main:app --reload
```

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend/interviewPrep
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in `frontend/interviewPrep/` (or `.env.local`):
```env
VITE_API_URL=http://localhost:8000
```

Run the development server:
```bash
npm run dev
```

## ☁️ Deployment

### Backend (AWS Lambda)
The backend is containerized and deployed to AWS Lambda using a custom Docker image.

1. **Build the Docker image**:
   ```bash
   docker build --platform linux/amd64 -f backend/Dockerfile -t breadwinner-backend backend
   ```
2. **Push to AWS ECR**:
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.<region>.amazonaws.com
   docker tag breadwinner-backend:latest <your-repo-uri>:latest
   docker push <your-repo-uri>:latest
   ```
3. **Update Lambda**: Update the Lambda function to use the new image URI.

### Frontend (AWS Amplify)
1. Connect your repository to AWS Amplify.
2. Set the environment variable `VITE_API_URL` in the Amplify console to your Lambda Function URL or API Gateway endpoint.
3. Trigger a build.