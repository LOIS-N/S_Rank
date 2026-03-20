import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { usePrivy } from '@privy-io/react-auth';

// 1. Axios 모킹
vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;

// 2. Privy 모킹
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: vi.fn(),
}));

describe('useAuth Hook with Axios Mocking', () => {
  const mockToken = 'test-token-123';
  const mockUser = { id: 'privy-user-id' };
  const mockBackendData = { isNewUser: true };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  it('should call axios.post with correct URL, Headers, and Body when authenticated', async () => {
    // Privy 상태 설정: 인증됨, 토큰 제공
    (usePrivy as any).mockReturnValue({
      authenticated: true,
      user: mockUser,
      getAccessToken: vi.fn().mockResolvedValue(mockToken),
    });

    // Axios 응답 설정
    mockedAxios.post.mockResolvedValue({
      data: { success: true, data: mockBackendData },
    });

    renderHook(() => useAuth());

    // axios.post 호출 검증
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        { identityToken: mockToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mockToken,
          },
        }
      );
    });

    // Zustand 스토어 업데이트 검증
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().identityToken).toBe(mockToken);
    expect(useAuthStore.getState().user).toEqual(mockBackendData);
  });
});
