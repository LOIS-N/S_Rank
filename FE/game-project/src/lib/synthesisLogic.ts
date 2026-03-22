// --- 합성 시스템 로직 (테스트 코드 — BE 미연동) ---

const GRADE_ORDER = ['D', 'C', 'B', 'A', 'S'] as const;
type Grade = typeof GRADE_ORDER[number];

interface SynthesisTable {
  prob3: number;
  prob4: number;
  prob5: number;
  cost: number;
  nextGrade: Grade;
}

const SYNTHESIS_DATA: Record<string, SynthesisTable> = {
  D: { prob3: 60, prob4: 70, prob5: 80, cost: 500, nextGrade: 'C' },
  C: { prob3: 40, prob4: 50, prob5: 60, cost: 5000, nextGrade: 'B' },
  B: { prob3: 25, prob4: 30, prob5: 35, cost: 30000, nextGrade: 'A' },
  A: { prob3: 12, prob4: 20, prob5: 30, cost: 50000, nextGrade: 'S' },
};

// S→S 합성: 2장 소모, 100% 성공, 비용 0
const S_TO_S_DATA = { prob: 100, cost: 0, cardCount: 2, nextGrade: 'S' as Grade };

export function getSynthesisData(grade: string) {
  if (grade === 'S') return S_TO_S_DATA;
  return SYNTHESIS_DATA[grade] || null;
}

export function getSynthesisCost(grade: string): number {
  if (grade === 'S') return S_TO_S_DATA.cost;
  return SYNTHESIS_DATA[grade]?.cost ?? 0;
}

export function getSynthesisProb(grade: string, cardCount: number): number {
  if (grade === 'S') return cardCount >= 2 ? 100 : 0;
  const data = SYNTHESIS_DATA[grade];
  if (!data) return 0;
  if (cardCount === 3) return data.prob3;
  if (cardCount === 4) return data.prob4;
  if (cardCount >= 5) return data.prob5;
  return 0;
}

export function getNextGrade(grade: string): string {
  if (grade === 'S') return 'S';
  return SYNTHESIS_DATA[grade]?.nextGrade ?? grade;
}

export function getRequiredCardCount(grade: string): { min: number; max: number } {
  if (grade === 'S') return { min: 2, max: 2 };
  return { min: 3, max: 5 };
}

export type SynthesisResult = {
  success: boolean;
  cost: number;
  resultGrade: string;
  error?: 'GRADE_MISMATCH' | 'INSUFFICIENT_CARDS' | 'INSUFFICIENT_GOLD' | 'INVALID_GRADE';
};

export function simulateSynthesis(
  grade: string,
  cardCount: number,
  currentGold: number,
): SynthesisResult {
  const cost = getSynthesisCost(grade);
  const nextGrade = getNextGrade(grade);

  // S→S: 2장 고정
  if (grade === 'S') {
    if (cardCount < 2) {
      return { success: false, cost: 0, resultGrade: grade, error: 'INSUFFICIENT_CARDS' };
    }
    // TODO: 테스트 모드 — 골드 체크 비활성화 (BE 연동 시 복원)
    // if (currentGold < cost) {
    //   return { success: false, cost: 0, resultGrade: grade, error: 'INSUFFICIENT_GOLD' };
    // }
    return { success: true, cost, resultGrade: nextGrade };
  }

  // D~A: 3~5장
  if (!SYNTHESIS_DATA[grade]) {
    return { success: false, cost: 0, resultGrade: grade, error: 'INVALID_GRADE' };
  }
  if (cardCount < 3) {
    return { success: false, cost: 0, resultGrade: grade, error: 'INSUFFICIENT_CARDS' };
  }
  // TODO: 테스트 모드 — 골드 체크 비활성화 (BE 연동 시 복원)
  // if (currentGold < cost) {
  //   return { success: false, cost: 0, resultGrade: grade, error: 'INSUFFICIENT_GOLD' };
  // }

  const prob = getSynthesisProb(grade, cardCount);
  const isSuccess = Math.random() * 100 < prob;

  return {
    success: isSuccess,
    cost,
    resultGrade: isSuccess ? nextGrade : grade,
  };
}
