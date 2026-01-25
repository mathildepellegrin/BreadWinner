# Quick Start - Test the Dashboard with Real Data

## ✅ What's been done:

- ✅ Database tables created
- ✅ Test user created: `test@example.com`
- ✅ 8 sample job applications seeded into the database

## 🔑 Next Steps to See the Dashboard Working:

### 1. Open your browser and go to:

```
http://localhost:5173
```

### 2. Login with the test account:

**Email:** `test@example.com`  
**Password:** `testpassword123` (any password works - the backend auto-creates users)

### 3. Click "Log In"

You should see:

- Token gets stored in localStorage
- You get redirected to `/dashboard`

### 4. View the Dashboard

The Dashboard will now show:

- **Upcoming Interviews** section with jobs in "Applied" and "Interviewing" status (5 jobs)
- **Completed Interviews** section with jobs in "Offer" and "Rejected" status (3 jobs)
- Each job shows: Company, Position, Date Applied, Match Score, and Status

## 📊 Test Data Breakdown:

**Upcoming Interviews (5 jobs):**

1. Google - Senior Python Developer (Applied, 85%)
2. Microsoft - Full Stack Engineer (Interviewing, 92%)
3. OpenAI - ML Engineer (Applied, 78%)
4. Meta - Backend Engineer (Interviewing, 88%)
5. Stripe - Data Engineer (Applied, 84%)

**Completed Interviews (3 jobs):**

1. Amazon - DevOps Engineer (Offer, 91%)
2. Apple - Frontend Developer (Rejected, 70%)
3. Databricks - Solutions Architect (Interviewing, 87%)

## 🔍 Debugging Tips:

### Check browser console:

Open DevTools (F12) and look for these logs when the Dashboard loads:

```
📋 Fetching job applications...
📡 Jobs API response status: 200
✅ Jobs fetched successfully { count: 8 }
📊 Jobs data: [...]
```

### If you get a 401 error:

- Make sure you're logged in
- Check localStorage for `authToken` (should be present)
- Try logging in again

### If you get a 500 error:

- Check backend logs: `docker-compose logs backend --tail=20`
- Verify database connection: `docker exec interview_db psql -U admin -d mock_interview -c "SELECT COUNT(*) FROM job_applications;"`

## 🔄 To Add More Test Data:

Just run the seed script again:

```bash
docker exec interview_backend python seed.py
```

It will add 8 more jobs (creating duplicates is fine for testing).

## 🗑️ To Reset Everything:

```bash
# Stop containers and remove volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build

# Seed the database again
docker exec interview_backend python seed.py
```
