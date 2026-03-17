// src/api/axios.js
import axios from "axios";

// [수정/추가됨] 1. axios 기본 인스턴스 생성
// 매번 http://localhost:8080 을 치기 귀찮으니 baseURL로 설정해 둠
const api = axios.create({
  baseURL: "http://localhost:8080", // 실제 백엔드 주소로 맞춰주면 돼!
});

// [수정/추가됨] 2. Network 탭에서 찾은 '정답 토큰' 하드코딩 (현재 테스트 목적)
// 🚨 주의: 테스트용이므로 나중에 Git에 올릴 때는 반드시 지우거나 빈 문자열로 둬야 해!
const TEMP_TEST_TOKEN = "Network 참고";

// [수정/추가됨] 3. axios 요청 인터셉터 (Interceptor) 설정
// 우리 앱에서 'api' 객체를 통해 나가는 모든 요청을 중간에 가로채서 헤더를 조작함
api.interceptors.request.use((config) => {
  // 토큰이 존재할 경우에만 Authorization 헤더에 Bearer 방식으로 추가
  if (TEMP_TEST_TOKEN) {
    config.headers.Authorization = `Bearer ${TEMP_TEST_TOKEN}`;
  }
  return config; // 조작된 설정을 그대로 통과시켜서 서버로 보냄
});

// [수정/추가됨] 4. 설정이 끝난 api 객체를 외부에서 쓸 수 있게 export
export default api;