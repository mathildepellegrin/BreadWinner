# Database Migration Guide

## Step 1: Make sure Docker containers are running

```bash
# From the project root directory
docker-compose up --build
```

## Step 2: Access the database to check/create tables

The `Base.metadata.create_all()` in `main.py` should automatically create tables on startup, but to verify:

```bash
# Check if tables exist
docker exec interview_db psql -U admin -d mock_interview -c "\dt"

# You should see tables like:
# - users
# - job_applications
# - interview_sessions
# - companies
# - questions
# - resumes
```

## Step 3: Seed the database with test data

The backend Docker container should have Python and the seed script available:

```bash
# Run the seed script inside the backend container
docker exec interview_backend python seed.py
```

This will create:

- A test user: `test@example.com` / password: `testpassword123`
- 8 sample job applications with different statuses

## Step 4: Test the login flow

1. Go to the login page
2. Login with: `test@example.com` (password can be anything for now)
3. This will create an auth token
4. The Dashboard will then fetch the jobs with the auth token

## Step 5: Verify in browser console

After login, you should see in the console:

```
🔐 Initiating login with email: test@example.com
📡 Login API response status: 200
✅ Login successful { userId: 1, email: 'test@example.com' }
💾 Authentication token stored successfully
🎉 Login flow completed
📋 Fetching job applications...
📡 Jobs API response status: 200
✅ Jobs fetched successfully { count: 8 }
📊 Jobs data: [...]
```

## Troubleshooting

### 500 Internal Server Error on /api/jobs

- Make sure you're logged in (token should be in localStorage)
- Check backend logs: `docker-compose logs backend --tail=20`
- Verify database has been seeded

### Database Connection Error

```bash
# Check database is running
docker-compose logs db

# Verify connection
docker exec interview_db psql -U admin -d mock_interview -c "SELECT 1"
```

### Tables not created

```bash
# Restart backend to trigger table creation
docker-compose restart backend
```

### Need to reset everything

```bash
# Stop and remove containers and volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build
```
