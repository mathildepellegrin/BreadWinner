import requests

# Test URLs - these are known job posting URLs that should be scrapable
test_urls = [
    "https://jobs.lever.co/openai/8b8e88cb-0e24-4fe8-9f89-881b7f5c7e1b",  # OpenAI job posting
    "https://www.remotewlb.com/apply/senior-software-engineer-backend-2562",  # Remote job board
    "https://boards.greenhouse.io/embed/job_app?token=5742142004",  # Greenhouse job board
]

print("Testing web scraping endpoint...\n")

for url in test_urls:
    print(f"Testing: {url}")
    try:
        response = requests.post(
            "http://localhost:8000/api/jobs/test-scrape",
            json={"url": url},
            timeout=20
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print(f"✅ SUCCESS - Scraped {data['contentLength']} characters")
                print(f"Preview: {data['preview'][:200]}...")
            else:
                print(f"❌ FAILED - {data.get('error')}")
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print("-" * 80)
    print()
