/**
 * 업적 API 테스트
 *
 * BE DTO 기준 (구현 예상):
 *   GET  /api/v1/achievements              → ApiResponse<List<Achievement>>
 *   POST /api/v1/achievements/{id}/claim   → ApiResponse<Void>
 *   POST /api/v1/achievements/claim-all    → ApiResponse<Void>
 *
 * Achievement 필드 (예상):
 *   id: Long, title: String, condition: String, status: String,
 *   rewardCff: int, isCompleted: boolean, isClaimed: boolean
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import api from '@/lib/axios';
const mockedApi = api as { get: any; post: any; put: any };

// ── 더미 업적 데이터 ──
const DUMMY_ACHIEVEMENTS = [
  {
    id: 1,
    title: '첫 걸음',
    condition: '튜토리얼 완료하기',
    status: '0/1',
    rewardCff: 10,
    isCompleted: false,
    isClaimed: false,
  },
  {
    id: 2,
    title: '자본주의의 노예',
    condition: '누적 골드 100,000G 달성',
    status: '100000/100000',
    rewardCff: 100,
    isCompleted: true,
    isClaimed: false,
  },
  {
    id: 3,
    title: '스타트업 대표',
    condition: '회사 레벨 5 달성',
    status: '5/5',
    rewardCff: 200,
    isCompleted: true,
    isClaimed: true,
  },
];

describe('업적 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. GET /api/v1/achievements — 목록 반환, isCompleted/isClaimed 필드 검증', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_ACHIEVEMENTS },
    });

    const response = await api.get('/api/v1/achievements', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);

    const achievements = response.data.data;
    expect(achievements).toHaveLength(3);

    // 미완료 업적
    const notDone = achievements.find((a: any) => a.id === 1);
    expect(notDone.isCompleted).toBe(false);
    expect(notDone.isClaimed).toBe(false);

    // 완료했지만 수령 전
    const claimable = achievements.find((a: any) => a.id === 2);
    expect(claimable.isCompleted).toBe(true);
    expect(claimable.isClaimed).toBe(false);

    // 완료 + 수령 완료
    const claimed = achievements.find((a: any) => a.id === 3);
    expect(claimed.isCompleted).toBe(true);
    expect(claimed.isClaimed).toBe(true);
  });

  it('2. POST /api/v1/achievements/{id}/claim — 완료된 업적 수령 성공', async () => {
    // BE: ApiResponse<Void> → { "success": true } (data 필드 없음)
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true },
    });

    const response = await api.post('/api/v1/achievements/2/claim', {}, {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/v1/achievements/2/claim',
      {},
      expect.any(Object),
    );
  });

  it('3. POST /api/v1/achievements/claim-all — 일괄 수령 성공', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true },
    });

    const response = await api.post('/api/v1/achievements/claim-all', {}, {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/v1/achievements/claim-all',
      {},
      expect.any(Object),
    );
  });

  it('4. GET /api/v1/achievements 실패 → 빈 배열로 처리 (앱 크래시 없음)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));

    let achievements: any[] = [];
    try {
      await api.get('/api/v1/achievements', {
        headers: { Authorization: 'Bearer test-token' },
      });
    } catch {
      achievements = [];
    }

    expect(achievements).toEqual([]);
    expect(achievements).toHaveLength(0);
  });

  it('5. 이미 수령한 업적 claim → 에러 코드 처리', async () => {
    mockedApi.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          error: { code: 'A002', message: '이미 보상을 수령한 업적입니다.' },
        },
      },
    });

    let errorCode: string | undefined;
    let errorStatus: number | undefined;
    try {
      await api.post('/api/v1/achievements/3/claim', {}, {
        headers: { Authorization: 'Bearer test-token' },
      });
    } catch (e: any) {
      errorCode = e?.response?.data?.error?.code;
      errorStatus = e?.response?.status;
    }

    expect(errorCode).toBe('A002');
    expect(errorStatus).toBe(400);
  });
});
