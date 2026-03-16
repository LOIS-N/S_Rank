package com.ssafy.srank.quest.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.srank.quest.application.dto.response.AiSubQuestResponse;
import com.ssafy.srank.quest.repository.SubQuestTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SubQuestScheduleService {

    private final RestClient openAiRestClient;
    private final SubQuestTemplateRepository subQuestRepository;
    private final ObjectMapper objectMapper;

    public void generateAndSave(int difficulty) throws JsonProcessingException {
        AiSubQuestResponse response = openAiRestClient.post()
                .uri("/chat/completions")
                .body(Map.of(
                        "model", "gpt-4.1-nano",
                        "messages", List.of(
                                Map.of("role", "system", "content", SYSTEM_PROMPT),
                                Map.of("role", "user", "content", "난이도 " + difficulty + " 서브퀘스트 5개 생성해줘.")
                        ),
                        "max_tokens", 4096,
                        "temperature", 0.3
                ))
                .retrieve()
                .body(AiSubQuestResponse.class);

        AiSubQuestResponse.SubQuestListContent listContent =
                objectMapper.readValue(response.getContent(), AiSubQuestResponse.SubQuestListContent.class);
        listContent.getQuests().forEach(quest -> subQuestRepository.save(quest.toEntity()));
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
            - requiredSkills는 BE/FE/DEV/AI/DBA/DESIGN 중 중복없이 3개를 선택합니다.
            - 스탯 범위는 난이도별 기준을 반드시 따릅니다.
            - JSON 외 다른 텍스트는 절대 출력하지 마세요.
                        
            난이도별 스탯 기준:
            - 난이도 1: 포지션 3개, 스탯 10~20, 기준시간 1분, 보상 900G
            - 난이도 2: 포지션 3개, 스탯 20~40, 기준시간 3분, 보상 3000G
            - 난이도 3: 포지션 4개, 스탯 30~60, 기준시간 10분, 보상 10000G
            - 난이도 4: 포지션 4개, 스탯 40~80, 기준시간 30분, 보상 37500G
            - 난이도 5: 포지션 5개, 스탯 50~90, 기준시간 90분, 보상 135000G
            - 난이도 6: 포지션 5개, 스탯 65~100, 기준시간 240분, 보상 450000G
                        
            출력 형식:
            {
              "quests": [
                {
                  "title": "퀘스트 제목",
                  "description": "퀘스트 설명 (1~2문장)",
                  "difficulty": 난이도(1~6),
                  "durationMinutes": 기준시간,
                  "rewardGold": 보상골드,
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
