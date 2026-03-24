// src/lib/axios.ts
import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Privy의 getAccessToken 함수 참조.
 * useAuth 훅이 인증 완료 후 setTokenRefresher()로 등록한다.
 */
let _getAccessToken: (() => Promise<string | null>) | null = null;

export function setTokenRefresher(fn: (() => Promise<string | null>) | null) {
    _getAccessToken = fn;
}

// 401 Unauthorized → 토큰 자동 갱신 후 재시도, 재시도도 실패 시 세션 만료 모달
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error?.config?.url ?? '';

        // 로그인 요청 자체의 401은 무시 (아직 인증 전)
        if (error?.response?.status === 401 && !url.includes('/auth/login')) {
            // 이미 재시도한 요청이면 더 이상 갱신 시도하지 않고 모달 표시
            if (error.config?._retried) {
                import('@/store/useGameStore').then(({ useGameStore }) => {
                    useGameStore.getState().setSessionExpiredModal(true);
                });
                return Promise.reject(error);
            }

            // Privy 토큰 갱신 시도
            if (_getAccessToken) {
                try {
                    const newToken = await _getAccessToken();
                    if (newToken) {
                        // 스토어의 토큰도 업데이트
                        import('@/store/useUserStore').then(({ useUserStore }) => {
                            useUserStore.getState().updateAccessToken(newToken);
                        });

                        // 원 요청을 새 토큰으로 재시도
                        error.config._retried = true;
                        error.config.headers['Authorization'] = `Bearer ${newToken}`;
                        return axiosInstance.request(error.config);
                    }
                } catch {
                    // 갱신 자체가 실패한 경우 → 세션 만료
                }
            }

            // 갱신 불가 → 세션 만료 모달
            import('@/store/useGameStore').then(({ useGameStore }) => {
                useGameStore.getState().setSessionExpiredModal(true);
            });
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
