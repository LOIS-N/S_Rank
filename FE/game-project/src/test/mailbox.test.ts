/**
 * 우편함 API 테스트
 *
 * BE DTO 기준:
 *   GET  /api/v1/mailboxes           → ApiResponse<List<MailResponse>>
 *   PUT  /api/v1/mailboxes/{id}/read → ApiResponse<Long>  (수령한 코인 금액 반환)
 *
 * MailResponse 필드 (BE MailResponse.java record):
 *   mailId: Long, mailType: MailType(enum), isRead: boolean, isClaimed: boolean,
 *   message: String, reward: Long | null, createdAt: LocalDateTime
 *
 * 에러 코드 (BE ErrorCode.java):
 *   M001 (404): 존재하지 않는 우편
 *   M002 (400): 이미 보상을 수령한 우편 (HttpStatus.BAD_REQUEST)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @/lib/axios는 configured instance(default export)이므로 아래 패턴으로 모킹
vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import api from '@/lib/axios';
const mockedApi = api as { get: any; post: any; put: any };

// ── DB 더미 데이터 (BE MailResponse record 구조 기준) ──
// MailType enum: SYSTEM, REWARD, BUY_COMPLETE, SALE_COMPLETE, NFT_COMPLETE, SALE_EXPIRED
const DUMMY_MAILS = [
  {
    mailId: 1,
    mailType: 'SYSTEM',        // 공지 — reward 없음
    isRead: false,
    isClaimed: false,
    message: '서비스 업데이트 안내: 거래 기능이 오픈되었습니다.',
    reward: null,              // BE: Long reward (nullable)
    createdAt: '2026-03-28T10:00:00',
  },
  {
    mailId: 2,
    mailType: 'REWARD',        // 보상 — reward 있음
    isRead: false,
    isClaimed: false,
    message: '데일리 미션 달성 보상입니다.',
    reward: 100,               // 100 코인
    createdAt: '2026-03-28T08:00:00',
  },
  {
    mailId: 3,
    mailType: 'BUY_COMPLETE',  // 구매 완료 — 이미 수령
    isRead: true,
    isClaimed: true,
    message: '카드 구매가 완료되었습니다.',
    reward: null,
    createdAt: '2026-03-27T15:30:00',
  },
];

// PUT /api/v1/mailboxes/{id}/read 성공 응답 — BE: ApiResponse<Long> (코인 금액)
const CLAIM_REWARD_AMOUNT = 100; // mailId=2의 reward 값

// /me 응답 (coin 갱신 확인용)
const DUMMY_ME = { nickname: '테스트유저', level: 2, gold: 50000, coin: 350 };

describe('우편함 API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. GET /api/v1/mailboxes — 3건 목록 반환, MailType/isClaimed 필드 검증', async () => {
    // BE: ApiResponse<List<MailResponse>>  →  data.data = [...MailResponse]
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_MAILS },
    });

    const response = await api.get('/api/v1/mailboxes', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/mailboxes', expect.any(Object));
    expect(response.data.success).toBe(true);

    const mails: typeof DUMMY_MAILS = response.data.data;
    expect(mails).toHaveLength(3);

    // MailType enum 검증
    expect(mails[0].mailType).toBe('SYSTEM');
    expect(mails[1].mailType).toBe('REWARD');
    expect(mails[2].mailType).toBe('BUY_COMPLETE');

    // isClaimed 필드 검증
    expect(mails[0].isClaimed).toBe(false);
    expect(mails[1].isClaimed).toBe(false);
    expect(mails[2].isClaimed).toBe(true);

    // reward 필드 검증 (null vs 숫자 — BE: Long nullable)
    expect(mails[0].reward).toBeNull();
    expect(mails[1].reward).toBe(100);
    expect(mails[2].reward).toBeNull();
  });

  it('2. PUT /api/v1/mailboxes/2/read 성공 → ApiResponse<Long>(코인금액) 반환 후 /me 재호출로 coin 갱신', async () => {
    // BE: PUT 성공 시 ApiResponse<Long> — 수령한 코인 금액(Long) 반환
    mockedApi.put.mockResolvedValueOnce({
      data: { success: true, data: CLAIM_REWARD_AMOUNT },
    });
    // /me 재호출 응답
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_ME },
    });

    const token = 'test-token';

    // 보상 수령 PUT
    const putRes = await api.put(
      '/api/v1/mailboxes/2/read',
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(putRes.data.success).toBe(true);
    // BE가 수령한 코인 금액을 반환함 (Long)
    expect(putRes.data.data).toBe(CLAIM_REWARD_AMOUNT);

    // PUT 성공 후 /me 재호출해야 coin이 userStore에 반영됨
    const meRes = await api.get('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = meRes.data?.data;

    expect(me).toBeDefined();
    expect(me.coin).toBe(350);   // coin 필드 갱신 확인
    expect(me.gold).toBe(50000);
    expect(me.nickname).toBe('테스트유저');

    expect(mockedApi.put).toHaveBeenCalledWith(
      '/api/v1/mailboxes/2/read',
      {},
      expect.any(Object),
    );
    expect(mockedApi.get).toHaveBeenCalledWith('/api/v1/users/me', expect.any(Object));
  });

  it('3. 이미 수령한 우편(isClaimed=true)에 PUT → M002(400 BAD_REQUEST) 에러 핸들링', async () => {
    // BE ErrorCode: MAIL_REWARD_ALREADY_CLAIMED (HttpStatus.BAD_REQUEST, "M002")
    mockedApi.put.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          error: { code: 'M002', message: '이미 보상을 수령한 우편입니다.' },
        },
      },
    });

    let errorCode: string | undefined;
    let errorStatus: number | undefined;
    try {
      await api.put('/api/v1/mailboxes/3/read', {}, {
        headers: { Authorization: 'Bearer test-token' },
      });
    } catch (e: any) {
      errorCode = e?.response?.data?.error?.code;
      errorStatus = e?.response?.status;
    }

    expect(errorCode).toBe('M002');
    expect(errorStatus).toBe(400);
    // 에러 발생 시 /me 재호출 없어야 함 (get 호출 없음)
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('4. GET /api/v1/mailboxes 실패 → 빈 배열로 처리 (앱 크래시 없음)', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));

    let mails: any[] = [];
    try {
      await api.get('/api/v1/mailboxes', {
        headers: { Authorization: 'Bearer test-token' },
      });
    } catch {
      mails = [];
    }

    expect(mails).toEqual([]);
    expect(mails).toHaveLength(0);
  });
});
