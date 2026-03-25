export interface TutorialCard {
  cardId: number;       // negative IDs: -1, -2, -3, -100 (C_9)
  grade: string;
  name: string;
  imageUrl: string;
  skill1: { skillType: string; value: number };
  skill2: { skillType: string; value: number };
  skill3: { skillType: string; value: number };
  specialAbility: null;
  enhanceTryCount: number;
  enhanceSuccessCount: number;
}

const ASSET_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function randStat() { return Math.floor(Math.random() * 3) + 3; }

export function generateTutorialCard(drawIndex: number): TutorialCard {
  const imgs = ['D_8', 'D_9', 'D_10'];
  const names = ['박민준', '이서연', '최지우'];
  return {
    cardId: -(drawIndex + 1),
    grade: 'D',
    name: names[drawIndex % 3],
    imageUrl: `${ASSET_BASE}/assets/cards/dRank/${imgs[drawIndex % 3]}.webp`,
    skill1: { skillType: 'BE', value: randStat() },
    skill2: { skillType: 'FE', value: randStat() },
    skill3: { skillType: 'INF', value: randStat() },
    specialAbility: null,
    enhanceTryCount: 0,
    enhanceSuccessCount: 0,
  };
}

export function generateSynthesisCard(): TutorialCard {
  return {
    cardId: -100,
    grade: 'C',
    name: '오하린',
    imageUrl: `${ASSET_BASE}/assets/cards/cRank/C_9.webp`,
    skill1: { skillType: 'DESIGN', value: 30 },
    skill2: { skillType: 'DBA', value: 30 },
    skill3: { skillType: 'INF', value: 30 },
    specialAbility: null,
    enhanceTryCount: 0,
    enhanceSuccessCount: 0,
  };
}

export interface TutorialQuestDef {
  questId: number;
  title: string;
  description: string;
  difficulty: number;
  requiredSkillType1: string; requiredSkillValue1: number;
  requiredSkillType2: string; requiredSkillValue2: number;
  requiredSkillType3: string; requiredSkillValue3: number;
  durationMinutes: number;
  cardSlotCount: number;
  rewardGold: number;
  isMain: boolean;
}

export const TUTORIAL_QUEST_2: TutorialQuestDef = {
  questId: -2, title: '시장조사를 하자',
  description: '나만의 회사를 차리기 전, 좋은 아이템을 조사할 필요가 있다. 팀원들과 함께 시장 조사를 해보자.',
  difficulty: 1,
  requiredSkillType1: 'FE', requiredSkillValue1: 10,
  requiredSkillType2: 'BE', requiredSkillValue2: 10,
  requiredSkillType3: 'INF', requiredSkillValue3: 10,
  durationMinutes: 1, cardSlotCount: 3, rewardGold: 500, isMain: false,
};

export const TUTORIAL_QUEST_3: TutorialQuestDef = {
  questId: -3, title: '프로젝트를 기획하자',
  description: '좋은 아이템을 찾았다. 프로젝트를 본격적으로 시작하기 전, 서비스 설계와 기획 방향에 대해 확실히 이야기하자.',
  difficulty: 2,
  requiredSkillType1: 'FE', requiredSkillValue1: 30,
  requiredSkillType2: 'BE', requiredSkillValue2: 30,
  requiredSkillType3: 'INF', requiredSkillValue3: 30,
  durationMinutes: 1, cardSlotCount: 3, rewardGold: 0, isMain: false,
};

export const TUTORIAL_QUEST_4: TutorialQuestDef = {
  questId: -4, title: '프로젝트 프로토타입을 만들자',
  description: '정부지원 사업에 공모하기 위해 서비스의 와이어프레임과 프로토타입이 필요하다. Figma와 생성형 AI를 활용해 빠르게 시안을 만들자.',
  difficulty: 2,
  requiredSkillType1: 'DESIGN', requiredSkillValue1: 30,
  requiredSkillType2: 'DBA', requiredSkillValue2: 30,
  requiredSkillType3: 'INF', requiredSkillValue3: 30,
  durationMinutes: 1, cardSlotCount: 3, rewardGold: 0, isMain: false,
};

export interface ScriptLine { text: string; isSystem?: boolean; }

export const TUTORIAL_SCRIPTS: Record<string, ScriptLine[]> = {
  // Step 0: shown immediately after story ends (before step1_intro)
  step0_init: [
    { text: '로딩 중....', isSystem: true },
    { text: '[{{nickname}}님] 확인 완료.', isSystem: true },
  ],
  // After 3rd gacha pull (shown immediately on gacha page)
  gacha_done: [
    { text: '우와! 이렇게 직원들을 뽑을 수 있구나.' },
  ],
  // Step 1 intro (shown when story completes, main screen)
  step1_intro: [
    { text: '제네시스 블록 사용자를 위한 가이드를 시작합니다. 가이드는 총 네 단계입니다.', isSystem: true },
    { text: '첫번째, 새로운 직원들을 3명 영입하세요.', isSystem: true },
    { text: '어? 새로운 직원들을 영입하라고? 어디보자...' },
    { text: '뽑기를 세 번 하라고 했지.' },
  ],
  // Step 2 intro (main screen, after step1 done)
  step2_intro: [
    { text: '두 번째 가이드입니다. 방금 고용한 직원들을 통해 퀘스트를 수행할 수 있습니다.', isSystem: true },
    { text: '퀘스트 목록으로 이동해 퀘스트를 수행하세요.', isSystem: true },
    { text: '방금 채용한 직원들을 데리고 프로젝트를 해보면 되겠다.' },
  ],
  // Step 2 done (after 3s quest, main screen)
  step2_done: [
    { text: '퀘스트 수행 완료.', isSystem: true },
  ],
  // Step 3 intro (main screen)
  step3_intro: [
    { text: '세번째 가이드입니다. 회사를 성장시키기 위해, 다음 퀘스트를 수행하시오.', isSystem: true },
  ],
  // Step 3 hard (shown ON QUEST PAGE after user sees the hard quest)
  step3_hard: [
    { text: '어? 지금 내 직원들로는 할 수 없는 퀘스트인데...' },
    { text: '직원을 더 강하게 만들기 위해 \'강화\'를 사용할 수 있습니다.', isSystem: true },
    { text: '강화 기능이 있구나. 직원들을 더 강하게 키워볼까?' },
  ],
  // Step 31 done (shown on enhance page after 3 enhancements)
  step31_done: [
    { text: '다시 아까 그 퀘스트를 해볼까?' },
  ],
  // Step 32 done (after 5s quest)
  step32_done: [
    { text: '직원 강화를 통한 퀘스트 수행 완료.', isSystem: true },
  ],
  // Step 4 intro (main screen)
  step4_intro: [
    { text: '마지막 가이드입니다. 퀘스트 목록으로 이동해 퀘스트를 수행해주세요.', isSystem: true },
  ],
  // Step 4 missing design (shown ON QUEST PAGE)
  step4_missing: [
    { text: '어? 지금 내 직원들 중에서는 디자인을 할 수 있는 직원이 없어!' },
    { text: '새로운 직원을 고용하기 위한 \'합성\' 기능을 사용할 수 있습니다.', isSystem: true },
    { text: '기존 직원들을 합성하여 더욱 높은 등급의 직원을 고용할 수 있습니다.', isSystem: true },
    { text: '우와, 그러면 한 번 합성으로 새로운 직원을 데려와볼까?' },
  ],
  // Step 41 done (shown on synthesis page after synthesis)
  step41_done: [
    { text: '퀘스트를 다시 수행해볼까?' },
  ],
  // Step 99 final
  step99_final: [
    { text: '모든 튜토리얼 가이드를 완료하였습니다.', isSystem: true },
    { text: '제네시스 블록을 통해 당신만의 회사를 만들고, 성장시켜보세요.', isSystem: true },
  ],
};
