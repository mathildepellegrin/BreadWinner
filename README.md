# BreadWinner AI 🍞

**Developed at ConUHacks X (2026)**

BreadWinner AI is an advanced, AI-driven interview simulation and resume optimization platform designed to bridge the gap between academic learning and the rigorous demands of technical interviews. Built during a 24-hour sprint at Concordia University, it empowers students to practice with realistic AI avatars, optimize their resumes, and track their job search progress in one cohesive ecosystem.

## 🚀 Project Mission

Technical interviews are a distinct skill set from software engineering. Many qualified students fail not because of a lack of technical knowledge, but due to a lack of preparation for the interview format itself. BreadWinner democratizes access to high-quality mock interviews, providing real-time feedback and personalized study plans to help candidates land their dream jobs.

## ✨ Key Features

- **🤖 AI Interview Simulations**: Real-time, voice-interactive video interviews with an interactive AI avatar (powered by HeyGen & OpenRouter). The AI adapts questions based on your responses and provides instant feedback.
- **📄 Smart Resume Parsing**: Upload PDF/DOCX resumes to automatically extract structured data using PyMuPDF and python-docx, enabling gap analysis against job descriptions.
- **🔄 Automated Portfolio Updates**: Seamlessly syncs resume data with your user profile to keep your professional identity up-to-date.
- **📊 Job Application Tracking**: A Kanban-style dashboard to manage applications, track status, and view "Match Scores" for specific roles.
- **🧠 Study Lab**: Generates personalized technical, behavioral, and LeetCode study materials based on the specific requirements of a target job.

## 🛠️ Tech Stack

| Category | Technologies |
|----------|--------------|
| **Backend** | FastAPI (Python 3.11), Pydantic, SQLAlchemy |
| **Database** | PostgreSQL (Hosted on Neon), Psycopg2 |
| **Frontend** | React (Vite), TypeScript, Tailwind CSS, Lucide Icons |
| **AI & ML** | OpenRouter (Gemini 2.0/GPT-4), HeyGen SDK, Firecrawl |
| **Infrastructure** | AWS Lambda, Amazon ECR, AWS Amplify, Docker |
| **Tools** | Git, Postman, Docker Compose |

## 🏗️ Architecture & Infrastructure

We adopted a **Serverless Architecture** to ensure scalability and cost-efficiency, crucial for a hackathon project with potential for high burst traffic.

### Backend: AWS Lambda & API Gateway
- **Containerization**: The FastAPI backend is packaged as a Docker container. We utilized a multi-stage build process to ensure binary compatibility with Amazon Linux 2023, specifically handling `glibc` version mismatches for libraries like `PyMuPDF`.
- **Mangum Adapter**: We used `Mangum` as an adapter to wrap our ASGI FastAPI application, allowing it to process events from AWS Lambda and API Gateway seamlessly.
- **Proxy Integration**: API Gateway is configured with a proxy integration, forwarding all requests to the Lambda function. This allows FastAPI to handle routing internally, simplifying the cloud configuration.

### Frontend: AWS Amplify
- The React frontend is deployed via **AWS Amplify**, providing a robust CI/CD pipeline that automatically builds and deploys changes from our GitHub repository.
- Environment variables are managed within Amplify to point to the dynamic API Gateway endpoints.

## 🧠 Lessons Learned

Building a full-stack AI application in 24 hours came with significant challenges. Here are our key takeaways:

### 1. Serverless Constraints & Docker
Deploying Python applications with C-extensions (like `psycopg2` and `PyMuPDF`) to AWS Lambda is non-trivial. We learned that local Docker environments (Debian-based) differ from Lambda's runtime (Amazon Linux).
*   **Solution**: We switched to the `python:3.11-slim-bullseye` base image and forced `pip` to use `manylinux2014` wheels to ensure binary compatibility.

### 2. The CORS Conundrum
Connecting a frontend hosted on one domain (Amplify) to a backend on another (API Gateway) triggered strict CORS policies.
*   **Solution**: We configured FastAPI's `CORSMiddleware` to accept specific origins dynamically and ensured our API Gateway responses included the necessary `Access-Control-Allow-Origin` headers.

### 3. Stateless Authentication
Since Lambda functions are ephemeral, storing session data in memory (like a simple token dictionary) caused failures when requests hit different container instances.
*   **Solution**: We implemented stateless authentication using **JWT (JSON Web Tokens)**, allowing any Lambda instance to verify user identity without shared state.

## 📦 Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js & npm
- Docker (for deployment)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Run locally
uvicorn main:app --reload
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