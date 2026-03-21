// src/lib/axios.ts
import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
    // baseURL을 비워 Next.js rewrites(/api/* → BE)를 통한 프록시 사용
    // → 개발 환경(localhost)에서 CORS 우회, 배포 환경에서도 동일하게 동작
    baseURL: '',
    headers: {
        'Content-Type': 'application/json',
    },
});

// 401 Unauthorized → 세션 만료 모달 표시
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            // 로그인 요청 자체의 401은 무시 (아직 인증 전)
            const url = error?.config?.url ?? '';
            if (!url.includes('/auth/login')) {
                // 동적 import로 순환참조 방지
                import('@/store/useGameStore').then(({ useGameStore }) => {
                    useGameStore.getState().setSessionExpiredModal(true);
                });
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;