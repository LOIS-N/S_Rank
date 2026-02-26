import os
import requests
from dotenv import load_dotenv
from openai import OpenAI

# .env 파일 로드
load_dotenv()

# 환경 변수 가져오기
GITLAB_URL = os.getenv("GITLAB_URL")
PROJECT_ID = os.getenv("GITLAB_PROJECT_ID")
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN")

SONAR_URL = os.getenv("SONAR_URL")
SONAR_TOKEN = os.getenv("SONAR_TOKEN")
PROJECT_KEY = os.getenv("SONAR_PROJECT_KEY")

OPENAI_KEY = os.getenv("OPENAI_API_KEY")

# CI 환경에서 MR 번호 자동 감지 (로컬 테스트 시에는 숫자로 직접 넣으세요)
MR_IID = os.getenv("CI_MERGE_REQUEST_IID") 

client = OpenAI(api_key=OPENAI_KEY)

def post_gitlab_comment(comment):
    """GitLab MR에 AI 리뷰 댓글을 작성합니다."""
    if not MR_IID:
        print("❌ MR 번호를 찾을 수 없습니다. (로컬 테스트라면 .env에 CI_MERGE_REQUEST_IID를 추가하세요)")
        return
        
    url = f"{GITLAB_URL}/api/v4/projects/{PROJECT_ID}/merge_requests/{MR_IID}/notes"
    headers = {"PRIVATE-TOKEN": GITLAB_TOKEN}
    response = requests.post(url, headers=headers, json={"body": comment})
    
    if response.status_code == 201:
        print("✅ GitLab MR에 댓글이 성공적으로 달렸습니다!")
    else:
        print(f"❌ 댓글 작성 실패: {response.status_code}, {response.text}")

def run_agent():
    print("🔍 소나큐브 이슈 분석 중...")
    sonar_api = f"{SONAR_URL}/api/issues/search?componentKeys={PROJECT_KEY}&resolved=false"
    issues = requests.get(sonar_api, auth=(SONAR_TOKEN, "")).json().get('issues', [])

    if not issues:
        review_content = "✅ 분석 결과, 모든 코드가 클린합니다! 완벽해요."
    else:
        issue_summary = "\n".join([f"- {i['message']} (파일: {i['component']})" for i in issues[:5]])
        prompt = f"너는 깐깐한 시니어 개발자야. 아래 보안/코드 결함을 보고 해결책을 포함한 리뷰를 한국어로 작성해줘:\n\n{issue_summary}"
        
        print("🤖 AI 리뷰 생성 중...")
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )
        review_content = completion.choices[0].message.content

    post_gitlab_comment(f"### 🤖 AI Agent Code Review\n\n{review_content}")

if __name__ == "__main__":
    run_agent()