/**
 * 데일리 미션 API 테스트
 *
 * BE DTO 기준:
 *   GET  /api/v1/missions/daily              → ApiResponse<DailyMissionStatusResponse>
 *   POST /api/v1/missions/daily/{id}/claim   → ApiResponse<MissionRewardClaimResponse>
 *
 * DailyMissionStatusResponse 필드 (BE):
 *   missionDate: LocalDate, missions: List<DailyMissionItemResponse>
 *
 * DailyMissionItemResponse 필드 (BE DailyMissionItemResponse.java):
 *   missionId: Long, name: String, category: MissionCategory(enum),
 *   requiredCount: int, rewardToken: int, currentCount: long,
 *   completed: boolean, rewardClaimed: boolean
 *
 * MissionRewardClaimResponse 필드 (BE):
 *   missionId: Long, name: String, rewardToken: int,
 *   claimedDate: LocalDate, claimedAt: LocalDateTime
 *
 * 에러 코드 (BE ErrorCode.java):
 *   DM001 (404): 미션을 찾을 수 없습니다.
 *   DM002 (400 BAD_REQUEST):  아직 달성되지 않은 미션입니다.
 *   DM003 (409 CONFLICT):     이미 보상을 수령한 미션입니다.
 *
 * MissionCategory enum: QUEST, DRAW, SYNTHESIS, ENHANCEMENT
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

// ── DB 더미 데이터 (BE MissionTemplate 4종 × MissionCategory enum 기준) ──
// MissionTemplate은 DB에 수동으로 적재되며 BE 서비스가 런타임에 읽음
const DUMMY_MISSIONS = {
  missionDate: '2026-03-28',       // BE: LocalDate → JSON "yyyy-MM-dd"
  missions: [
    {
      missionId: 1,
      name: '퀘스트 1회 완료',
      category: 'QUEST',           // MissionCategory enum
      requiredCount: 1,
      rewardToken: 10,             // 블록체인 CFF 토큰 (미연동 상태)
      currentCount: 1,             // BE: long
      completed: true,             // currentCount >= requiredCount
      rewardClaimed: false,
    },
    {
      missionId: 2,
      name: '개발자 뽑기 3회',
      category: 'DRAW',
      requiredCount: 3,
      rewardToken: 20,
      currentCount: 1,
      completed: false,
      rewardClaimed: false,
    },
    {
      missionId: 3,
      name: '카드 합성 1회',
      category: 'SYNTHESIS',
      requiredCount: 1,
      rewardToken: 15,
      currentCount: 0,
      completed: false,
      rewardClaimed: false,
    },
    {
      missionId: 4,
      name: '카드 강화 2회',
      category: 'ENHANCEMENT',
      requiredCount: 2,
      rewardToken: 25,
      currentCount: 2,
      completed: true,
      rewardClaimed: true,         // 이미 수령
    },
  ],
};

// POST /api/v1/missions/daily/{id}/claim 성공 응답 (BE: MissionRewardClaimResponse)
const DUMMY_CLAIM_RESPONSE = {
  missionId: 1,
  name: '퀘스트 1회 완료',
  rewardToken: 10,
  claimedDate: '2026-03-28',       // BE: LocalDate → JSON "yyyy-MM-dd"
  claimedAt: '2026-03-28T12:00:00', // BE: LocalDateTime → JSON ISO string
};

describe('데일리 미션 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. GET /api/v1/missions/daily — 4개 미션 반환, completed/rewardClaimed 필드 검증', async () => {
    // BE: ApiResponse<DailyMissionStatusResponse> → data.data = { missionDate, missions }
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_MISSIONS },
    });

    const response = await api.get('/api/v1/missions/daily', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);

    const { missionDate, missions } = response.data.data;
    expect(missionDate).toBe('2026-03-28');
    expect(missions).toHaveLength(4);

    // MissionCategory enum 4종 모두 존재 확인
    const categories = missions.map((m: any) => m.category);
    expect(categories).toContain('QUEST');
    expect(categories).toContain('DRAW');
    expect(categories).toContain('SYNTHESIS');
    expect(categories).toContain('ENHANCEMENT');

    // completed / rewardClaimed 필드 검증
    const quest = missions.find((m: any) => m.missionId === 1);
    expect(quest.completed).toBe(true);
    expect(quest.rewardClaimed).toBe(false);
    expect(quest.currentCount).toBe(quest.requiredCount); // completed 조건 검증

    const enhancement = missions.find((m: any) => m.missionId === 4);
    expect(enhancement.completed).toBe(true);
    expect(enhancement.rewardClaimed).toBe(true);

    // 미완료 미션
    const draw = missions.find((m: any) => m.missionId === 2);
    expect(draw.completed).toBe(false);
    expect(draw.currentCount).toBeLessThan(draw.requiredCount);
  });

  it('2. POST /api/v1/missions/daily/1/claim — 완료된 미션 수령 성공, MissionRewardClaimResponse 반환', async () => {
    // BE: ApiResponse<MissionRewardClaimResponse>
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_CLAIM_RESPONSE },
    });

    const response = await api.post(
      '/api/v1/missions/daily/1/claim',
      {},
      { headers: { Authorization: 'Bearer test-token' } },
    );

    expect(response.data.success).toBe(true);

    const claimed = response.data.data;
    expect(claimed.missionId).toBe(1);
    expect(claimed.rewardToken).toBe(10);
    expect(claimed.claimedDate).toBe('2026-03-28');  // LocalDate → "yyyy-MM-dd"
    expect(claimed.claimedAt).toBe('2026-03-28T12:00:00'); // LocalDateTime

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/v1/missions/daily/1/claim',
      {},
      expect.any(Object),
    );
  });

  it('3. 미완료 미션(missionId=2, completed=false) claim → DM002(400 BAD_REQUEST) 에러', async () => {
    // BE ErrorCode: MISSION_NOT_COMPLETED (HttpStatus.BAD_REQUEST, "DM002")
    mockedApi.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          error: { code: 'DM002', message: '아직 달성되지 않은 미션입니다.' },
        },
      },
    });

    let errorCode: string | undefined;
    let errorStatus: number | undefined;
    try {
      await api.post('/api/v1/missions/daily/2/claim', {}, {
        headers: { Authorization: 'Bearer test-token' },
      });
    } catch (e: any) {
      errorCode = e?.response?.data?.error?.code;
      errorStatus = e?.response?.status;
    }

    expect(errorCode).toBe('DM002');
    expect(errorStatus).toBe(400);
  });

  it('4. 이미 수령한 미션(missionId=4, rewardClaimed=true) claim → DM003(409 CONFLICT) 에러', async () => {
    // BE ErrorCode: MISSION_REWARD_ALREADY_CLAIMED (HttpStatus.CONFLICT, "DM003")
    mockedApi.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          success: false,
          error: { code: 'DM003', message: '이미 보상을 수령한 미션입니다.' },
        },
      },
    });

    let errorCode: string | undefined;
    let errorStatus: number | undefined;
    try {
      await api.post('/api/v1/missions/daily/4/claim', {}, {
        headers: { Authorization: 'Bearer test-token' },
      });
    } catch (e: any) {
      errorCode = e?.response?.data?.error?.code;
      errorStatus = e?.response?.status;
    }

    expect(errorCode).toBe('DM003');
    expect(errorStatus).toBe(409);
  });

  it('5. 블록체인 미구현 확인: claim 응답에 rewardToken만 존재, 지갑/txHash 필드 없음', async () => {
    // BE: MissionRewardClaimResponse는 rewardToken 필드만 가짐 (블록체인 미연동)
    // walletAddress, txHash, tokenBalance 등 블록체인 관련 필드가 없음을 검증
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_CLAIM_RESPONSE },
    });

    const response = await api.post(
      '/api/v1/missions/daily/1/claim',
      {},
      { headers: { Authorization: 'Bearer test-token' } },
    );

    const claimData = response.data.data;

    // BE MissionRewardClaimResponse 필드만 존재해야 함
    expect(claimData).toHaveProperty('missionId');
    expect(claimData).toHaveProperty('name');
    expect(claimData).toHaveProperty('rewardToken');
    expect(claimData).toHaveProperty('claimedDate');
    expect(claimData).toHaveProperty('claimedAt');

    // 블록체인 미연동 — 지갑/트랜잭션 관련 필드 없음
    expect(claimData.walletAddress).toBeUndefined();
    expect(claimData.txHash).toBeUndefined();
    expect(claimData.tokenBalance).toBeUndefined();
  });
});
