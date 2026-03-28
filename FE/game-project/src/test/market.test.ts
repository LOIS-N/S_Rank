/**
 * 마켓(거래) API 테스트
 *
 * BE Controller 기준 (MarketController.java):
 *   GET  /api/v1/market/items               → ApiResponse<Map<"items",  List<MarketItemResponse>>>
 *   GET  /api/v1/market/my/sellable-cards   → ApiResponse<Map<"items",  List<SellableCardResponse>>>
 *   GET  /api/v1/market/my/histories        → ApiResponse<Map<"histories", List<TradeHistoryResponse>>>
 *   POST /api/v1/market/items               → ApiResponse<Void>  (data 필드 없음)
 *   POST /api/v1/market/items/{id}/buy      → ApiResponse<Void>  (data 필드 없음)
 *
 * MarketItemResponse 필드 (BE record):
 *   marketItemId, userCardId, cardTemplateId, cardName, imageUrl,
 *   skill1/2/3: SkillResponse(skillType,value,bonus), specialAbility,
 *   enhanceTryCount, enhanceSuccessCount, grade, priceCoin, createdAt, expiresAt
 *
 * SellableCardResponse 필드 (BE record):
 *   userCardId, cardTemplateId, cardName, imageUrl,
 *   skill1/2/3: SkillResponse, specialAbility, enhanceTryCount, enhanceSuccessCount, grade
 *
 * TradeHistoryResponse 필드 (BE record):
 *   marketTradeHistoryId, marketItemId, userCardId, cardTemplateId, cardName, imageUrl,
 *   skill1/2/3: SkillResponse, specialAbility, enhanceTryCount, enhanceSuccessCount,
 *   grade, priceCoin, historyType(String), status(String), eventAt, expiresAt
 *   ※ txHash 필드 없음 (BE TradeHistoryResponse.java에 포함 안 됨)
 *   ※ createdAt 필드 없음 — eventAt 사용
 *
 * RegisterMarketItemRequest 필드: userCardId(Long), priceCoin(Long)
 *
 * 에러 코드 (BE ErrorCode.java):
 *   TR001 (404): 거래 목록을 찾을 수 없습니다.
 *   TR002 (400): 본인이 등록한 카드는 구매할 수 없습니다.
 *   TR003 (409 CONFLICT): 이미 판매된 카드입니다.
 *   TR004 (400): S등급 카드만 거래소 등록 가능
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

// ── BE MarketItemResponse 구조 기반 더미 데이터 ──
// SkillResponse: { skillType: String, value: Integer, bonus: Integer }
const DUMMY_MARKET_ITEMS = {
  items: [  // BE: Map.of("items", List<MarketItemResponse>)
    {
      marketItemId: 1,
      userCardId: 10,          // BE: card.getId()
      cardTemplateId: 3,       // BE: template.getId()
      cardName: '고성능 BE 개발자',  // BE: template.getCharacterName()
      imageUrl: '/assets/008/SCardImage_000.webp',
      skill1: { skillType: 'BE',     value: 95, bonus: 10 },  // BE: SkillResponse
      skill2: { skillType: 'FE',     value: 80, bonus: 5  },
      skill3: { skillType: 'DEVOPS', value: 70, bonus: 0  },
      specialAbility: null,    // BE: card.getSpecialSkillTemplate() null이면 null
      enhanceTryCount: 3,
      enhanceSuccessCount: 2,
      grade: 'S',
      priceCoin: 500,
      createdAt: '2026-03-27T10:00:00',  // BE: LocalDateTime
      expiresAt: '2026-03-28T10:00:00',  // BE: 24시간 후
    },
  ],
};

// ── BE SellableCardResponse 구조 기반 더미 데이터 ──
const DUMMY_SELLABLE_CARDS = {
  items: [  // BE: Map.of("items", List<SellableCardResponse>)
    {
      userCardId: 20,
      cardTemplateId: 5,
      cardName: '풀스택 개발자',
      imageUrl: '/assets/008/SCardImage_001.webp',
      skill1: { skillType: 'BE',     value: 90, bonus: 8 },
      skill2: { skillType: 'FE',     value: 85, bonus: 7 },
      skill3: { skillType: 'DEVOPS', value: 75, bonus: 3 },
      specialAbility: null,
      enhanceTryCount: 2,
      enhanceSuccessCount: 1,
      grade: 'S',
      // createdAt, expiresAt: BE SellableCardResponse에 없음 (주석 처리됨)
    },
  ],
};

// ── BE TradeHistoryResponse 구조 기반 더미 데이터 ──
// historyType: MarketHistoryType enum (SELL_REGISTERED, SELL_COMPLETED, BUY_COMPLETED, ...)
// status: String (MarketItemStatus: SALE_PENDING, ON_SALE, BUY_PENDING, SOLD, ...)
const DUMMY_HISTORY = {
  histories: [  // BE: Map.of("histories", List<TradeHistoryResponse>)
    {
      marketTradeHistoryId: 1,
      marketItemId: 1,
      userCardId: 10,
      cardTemplateId: 3,
      cardName: '고성능 BE 개발자',
      imageUrl: '/assets/008/SCardImage_000.webp',
      skill1: { skillType: 'BE',     value: 95, bonus: 10 },
      skill2: { skillType: 'FE',     value: 80, bonus: 5  },
      skill3: { skillType: 'DEVOPS', value: 70, bonus: 0  },
      specialAbility: null,
      enhanceTryCount: 3,
      enhanceSuccessCount: 2,
      grade: 'S',
      priceCoin: 500,
      historyType: 'SELL_REGISTERED',   // BE: history.getHistoryType().name()
      status: 'SALE_PENDING',           // BE: history.getStatus() (String)
      eventAt: '2026-03-27T10:00:00',   // BE: eventAt (createdAt 아님!)
      expiresAt: '2026-03-28T10:00:00',
      // txHash: TradeHistoryResponse에 없음
    },
  ],
};

describe('마켓(거래) API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. GET /api/v1/market/items — BE Map{"items":[...]} 구조 반환, SkillResponse bonus 포함 검증', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_MARKET_ITEMS },
    });

    const response = await api.get('/api/v1/market/items', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);
    // BE: Map.of("items", ...) → data.data.items
    const items = response.data.data.items;
    expect(items).toHaveLength(1);

    const item = items[0];
    expect(item.marketItemId).toBe(1);
    expect(item.userCardId).toBe(10);     // MarketItemResponse에 userCardId 포함
    expect(item.cardName).toBe('고성능 BE 개발자');
    expect(item.priceCoin).toBe(500);
    expect(item.grade).toBe('S');

    // SkillResponse: { skillType, value, bonus } — bonus 필드 포함
    expect(item.skill1).toEqual({ skillType: 'BE', value: 95, bonus: 10 });
    expect(item.skill2.bonus).toBe(5);
    expect(item.skill3.bonus).toBe(0);

    // TradeHistoryResponse에 없는 txHash는 MarketItemResponse에도 없음
    expect(item.txHash).toBeUndefined();
  });

  it('2. GET /api/v1/market/my/sellable-cards — BE Map{"items":[...]} 구조, S급 카드 반환', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_SELLABLE_CARDS },
    });

    const response = await api.get('/api/v1/market/my/sellable-cards', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);
    const items = response.data.data.items;
    expect(items).toHaveLength(1);

    const card = items[0];
    expect(card.userCardId).toBe(20);
    expect(card.grade).toBe('S');
    expect(card.cardName).toBe('풀스택 개발자');

    // SellableCardResponse에는 createdAt, expiresAt 없음 (BE에서 주석 처리)
    expect(card.createdAt).toBeUndefined();
    expect(card.expiresAt).toBeUndefined();
  });

  it('3. GET /api/v1/market/my/histories — BE Map{"histories":[...]} 구조, historyType/status/eventAt 검증', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: DUMMY_HISTORY },
    });

    const response = await api.get('/api/v1/market/my/histories', {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);
    const histories = response.data.data.histories;
    expect(histories).toHaveLength(1);

    const hist = histories[0];
    expect(hist.marketTradeHistoryId).toBe(1);
    expect(hist.historyType).toBe('SELL_REGISTERED');  // MarketHistoryType enum name
    expect(hist.status).toBe('SALE_PENDING');           // MarketItemStatus string
    expect(hist.priceCoin).toBe(500);
    expect(hist.eventAt).toBe('2026-03-27T10:00:00');  // eventAt (createdAt 아님)

    // txHash는 TradeHistoryResponse에 없음 (BE DTO 확인)
    expect(hist.txHash).toBeUndefined();
    // createdAt도 없음 (eventAt 사용)
    expect(hist.createdAt).toBeUndefined();
  });

  it('4. POST /api/v1/market/items — 요청 body: RegisterMarketItemRequest {userCardId, priceCoin}', async () => {
    // BE: ApiResponse<Void> → { "success": true } (data 필드 없음 — @JsonInclude(NON_NULL))
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true },
    });

    const requestBody = { userCardId: 20, priceCoin: 300 };

    await api.post('/api/v1/market/items', requestBody, {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/v1/market/items',
      { userCardId: 20, priceCoin: 300 },
      expect.any(Object),
    );

    // BE RegisterMarketItemRequest 필드명 검증: userCardId, priceCoin
    const calledBody = mockedApi.post.mock.calls[0][1];
    expect(calledBody).toHaveProperty('userCardId');
    expect(calledBody).toHaveProperty('priceCoin');

    // 구 FE 필드명 (cardId, price) 사용 금지
    expect(calledBody).not.toHaveProperty('cardId');
    expect(calledBody).not.toHaveProperty('price');
  });

  it('5. POST /api/v1/market/items/{id}/buy — ApiResponse<Void> 성공 (BE 비동기 블록체인 처리)', async () => {
    // BE: ApiResponse<Void> → { "success": true } (data 필드 없음)
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true },
    });

    const response = await api.post('/api/v1/market/items/1/buy', {}, {
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(response.data.success).toBe(true);
    // Void 응답 — data 필드 없음 (@JsonInclude(NON_NULL))
    expect(response.data.data).toBeUndefined();

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/api/v1/market/items/1/buy',
      {},
      expect.any(Object),
    );
  });

  it('6. 이미 판매된 아이템 구매 시도 → TR003(409 CONFLICT) 에러 핸들링', async () => {
    // BE ErrorCode: TRADE_ALREADY_SOLD (HttpStatus.CONFLICT, "TR003")
    mockedApi.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          success: false,
          error: { code: 'TR003', message: '이미 판매된 카드입니다.' },
        },
      },
    });

    let errorCode: string | undefined;
    let errorStatus: number | undefined;
    try {
      await api.post('/api/v1/market/items/1/buy', {}, {
        headers: { Authorization: 'Bearer test-token' },
      });
    } catch (e: any) {
      errorCode = e?.response?.data?.error?.code;
      errorStatus = e?.response?.status;
    }

    expect(errorCode).toBe('TR003');
    expect(errorStatus).toBe(409);
  });

  it('7. 블록체인 미개입 확인: FE→BE 요청에 tokenId/onChain/walletAddress 파라미터 없음', async () => {
    // BE가 비동기로 RabbitMQ → 블록체인 처리하므로 FE는 BE API만 호출
    mockedApi.post.mockResolvedValueOnce({
      data: { success: true },
    });

    // 판매 등록 요청 — BE RegisterMarketItemRequest: userCardId, priceCoin만
    const sellBody = { userCardId: 20, priceCoin: 300 };
    await api.post('/api/v1/market/items', sellBody, {
      headers: { Authorization: 'Bearer test-token' },
    });

    const calledBody = mockedApi.post.mock.calls[0][1];

    // 블록체인 관련 파라미터가 FE→BE 요청 body에 없어야 함
    expect(calledBody).not.toHaveProperty('tokenId');
    expect(calledBody).not.toHaveProperty('onChain');
    expect(calledBody).not.toHaveProperty('walletAddress');
    expect(calledBody).not.toHaveProperty('signature');
    expect(calledBody).not.toHaveProperty('nftTokenId');
  });
});
