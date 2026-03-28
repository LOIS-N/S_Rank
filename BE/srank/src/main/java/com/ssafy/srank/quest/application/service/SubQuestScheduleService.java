package com.ssafy.srank.quest.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.srank.common.metrics.MetricTagValues;
import com.ssafy.srank.common.metrics.QuestMetrics;
import com.ssafy.srank.quest.application.dto.response.AiSubQuestResponse;
import com.ssafy.srank.quest.repository.SubQuestTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubQuestScheduleService {

    private final RestClient openAiRestClient;
    private final SubQuestTemplateRepository subQuestRepository;
    private final ObjectMapper objectMapper;
    private final QuestMetrics questMetrics;

    public void generateAndSave(int difficulty, LocalDateTime questDate) throws JsonProcessingException {
        log.info("[SubQuestSchedule] OpenAI 서브 퀘스트 생성 시작 - difficulty={}", difficulty);

        long openAiStartNanos = System.nanoTime();
        AiSubQuestResponse response = openAiRestClient.post()
                .uri("/chat/completions")
                .body(Map.of(
                        "model", "gpt-5.2",
                        "messages", List.of(
                                Map.of("role", "developer", "content", SYSTEM_PROMPT),
                                Map.of("role", "user", "content", "난이도 " + difficulty + " 서브퀘스트 20개 생성해줘.")
                        ),
                        "temperature", 0.3
                ))
                .retrieve()
                .body(AiSubQuestResponse.class);
        questMetrics.recordOpenAiRequest(
                System.nanoTime() - openAiStartNanos,
                "generate_subquest",
                "gpt-5.2",
                MetricTagValues.number(difficulty),
                MetricTagValues.RESULT_SUCCESS
        );

        AiSubQuestResponse.SubQuestListContent listContent;
        try {
            listContent = objectMapper.readValue(response.getContent(), AiSubQuestResponse.SubQuestListContent.class);
        } catch (JsonProcessingException e) {
            log.warn("[SubQuestSchedule] OpenAI 응답 파싱 실패 - difficulty={}, error={}", difficulty, e.getMessage());
            questMetrics.recordParseFailure(MetricTagValues.number(difficulty));
            throw e;
        }

        listContent.getQuests().forEach(quest -> subQuestRepository.save(quest.toEntity(questDate)));
        questMetrics.recordSavedSubquests(MetricTagValues.number(difficulty), listContent.getQuests().size());

        log.info("[SubQuestSchedule] 서브 퀘스트 생성 완료 - difficulty={}, savedCount={}", difficulty, listContent.getQuests().size());
    }

    private String extractContent(String response) throws JsonProcessingException {
        // response에서 choices[0].message.content 추출
        JsonNode root = objectMapper.readTree(response);
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    private final String SYSTEM_PROMPT = """
            당신은 IT 스타트업 경영 시뮬레이션 게임의 퀘스트 생성 AI입니다.
            아래 조건에 맞는 서브퀘스트 1개를 JSON 형식으로 생성하세요.
                        
            규칙:
            - 퀘스트는 실제 IT 프로젝트를 모티브로 한 재미있는 제목과 설명이어야 합니다.
            - 예시 :  '모바일 청접장 제작', '랜딩 페이지 제작'
            - 한 퀘스트에서 requiredSkills는 BE/FE/DEV/AI/DBA/DESIGN 중 절대 중복없이 3개를 선택합니다.
            - 기준시간은 초로 나타내야합니다.
            - 스탯 범위는 난이도별 기준을 반드시 따릅니다.
            - JSON 외 다른 텍스트는 절대 출력하지 마세요.
                        
            난이도별 스탯 기준:
            - 난이도 1: 카드슬롯 3개, 포지션당 스탯 범위 15~25, 스탯 총합 범위 45~75, 기준시간 30초, 보상 2700G
            - 난이도 2: 카드슬롯 3개, 포지션당 스탯 범위 45~60, 스탯 총합 범위 135~180, 기준시간 60초, 보상 7000G
            - 난이도 3: 카드슬롯 4개, 포지션당 스탯 범위 90~120, 스탯 총합 범위 270~360, 기준시간 180초, 보상 25000G
            - 난이도 4: 카드슬롯 4개, 포지션당 스탯 범위 140~180, 스탯 총합 범위 420~540, 기준시간 600초, 보상 120000G
            - 난이도 5: 카드슬롯 5개, 포지션당 스탯 범위 190~240, 스탯 총합 범위 570~720, 기준시간 1800초, 보상 600000G
            - 난이도 6: 카드슬롯 5개, 포지션당 스탯 범위 235~285, 스탯 총합 범위 705~855, 기준시간 5400초, 보상 3000000G
                        
            출력 형식:
            {
              "quests": [
                {
                  "title": "퀘스트 제목",
                  "description": "퀘스트 설명 (1~2문장)",
                  "difficulty": 난이도(1~6),
                  "durationMinutes": 기준시간(초),
                  "rewardGold": 보상골드,
                  "card_slot_count" : 카드슬롯
                  "requiredSkills": [
                    {"skillType": "BE", "skillValue": 숫자},
                    {"skillType": "FE", "skillValue": 숫자},
                    {"skillType": "DEV", "skillValue": 숫자}
                  ]
                }
              ]
            }
            """;
}
