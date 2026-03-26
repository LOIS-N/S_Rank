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

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubQuestScheduleService {

    private static final String MODEL = "gpt-4.1-nano";

    private final RestClient openAiRestClient;
    private final SubQuestTemplateRepository subQuestRepository;
    private final ObjectMapper objectMapper;
    private final QuestMetrics questMetrics;

    public void generateAndSave(int difficulty) throws JsonProcessingException {
        log.info("[SubQuestSchedule] OpenAI sub quest generation started difficulty={}", difficulty);

        long startNanos = System.nanoTime();
        AiSubQuestResponse response;
        try {
            response = openAiRestClient.post()
                    .uri("/chat/completions")
                    .body(Map.of(
                            "model", MODEL,
                            "messages", List.of(
                                    Map.of("role", "system", "content", SYSTEM_PROMPT),
                                    Map.of("role", "user", "content", "난이도 " + difficulty + " 서브퀘스트 20개 생성해줘.")
                            ),
                            "max_tokens", 4096,
                            "temperature", 0.3
                    ))
                    .retrieve()
                    .body(AiSubQuestResponse.class);

            questMetrics.recordOpenAiRequest(
                    System.nanoTime() - startNanos,
                    "subquest_generate",
                    MODEL,
                    MetricTagValues.number(difficulty),
                    MetricTagValues.RESULT_SUCCESS
            );
        } catch (RuntimeException e) {
            questMetrics.recordOpenAiRequest(
                    System.nanoTime() - startNanos,
                    "subquest_generate",
                    MODEL,
                    MetricTagValues.number(difficulty),
                    MetricTagValues.RESULT_ERROR
            );
            throw e;
        }

        AiSubQuestResponse.SubQuestListContent listContent;
        try {
            listContent = objectMapper.readValue(response.getContent(), AiSubQuestResponse.SubQuestListContent.class);
        } catch (JsonProcessingException e) {
            log.warn("[SubQuestSchedule] OpenAI response parse failed difficulty={} error={}", difficulty, e.getMessage());
            questMetrics.recordParseFailure(MetricTagValues.number(difficulty));
            throw e;
        }

        listContent.getQuests().forEach(quest -> subQuestRepository.save(quest.toEntity()));
        questMetrics.recordSavedSubquests(MetricTagValues.number(difficulty), listContent.getQuests().size());
        log.info("[SubQuestSchedule] sub quest generation completed difficulty={} savedCount={}", difficulty, listContent.getQuests().size());
    }

    private String extractContent(String response) throws JsonProcessingException {
        JsonNode root = objectMapper.readTree(response);
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    private final String SYSTEM_PROMPT = """
            ?뱀떊? IT ?ㅽ??몄뾽 寃쎌쁺 ?쒕??덉씠??寃뚯엫???섏뒪???앹꽦 AI?낅땲??
            ?꾨옒 議곌굔??留욌뒗 ?쒕툕?섏뒪??1媛쒕? JSON ?뺤떇?쇰줈 ?앹꽦?섏꽭??
                        
            洹쒖튃:
            - ?섏뒪?몃뒗 ?ㅼ젣 IT ?꾨줈?앺듃瑜?紐⑦떚釉뚮줈 ???щ??덈뒗 ?쒕ぉ怨??ㅻ챸?댁뼱???⑸땲??
            - ?덉떆 :  '紐⑤컮??泥?젒???쒖옉', '?쒕뵫 ?섏씠吏 ?쒖옉'
            - requiredSkills??BE/FE/DEV/AI/DBA/DESIGN 以?以묐났?놁씠 3媛쒕? ?좏깮?⑸땲??
            - ?ㅽ꺈 踰붿쐞???쒖씠?꾨퀎 湲곗???諛섎뱶???곕쫭?덈떎.
            - JSON ???ㅻⅨ ?띿뒪?몃뒗 ?덈? 異쒕젰?섏? 留덉꽭??
                        
            ?쒖씠?꾨퀎 ?ㅽ꺈 湲곗?:
            - ?쒖씠??1: ?ъ???3媛? ?ъ??섎떦 ?ㅽ꺈 踰붿쐞 15~25, ?ㅽ꺈 珥앺빀 踰붿쐞 45~75, 湲곗??쒓컙 1遺? 蹂댁긽 2700G
            - ?쒖씠??2: ?ъ???3媛? ?ъ??섎떦 ?ㅽ꺈 踰붿쐞 45~60, ?ㅽ꺈 珥앺빀 踰붿쐞 135~180, 湲곗??쒓컙 3遺? 蹂댁긽 9000G
            - ?쒖씠??3: ?ъ???4媛? ?ъ??섎떦 ?ㅽ꺈 踰붿쐞 90~120, ?ㅽ꺈 珥앺빀 踰붿쐞 270~360, 湲곗??쒓컙 10遺? 蹂댁긽 30000G
            - ?쒖씠??4: ?ъ???4媛? ?ъ??섎떦 ?ㅽ꺈 踰붿쐞 120~160, ?ㅽ꺈 珥앺빀 踰붿쐞 360~480, 湲곗??쒓컙 30遺? 蹂댁긽 112500G
            - ?쒖씠??5: ?ъ???5媛? ?ъ??섎떦 ?ㅽ꺈 踰붿쐞 150~200, ?ㅽ꺈 珥앺빀 踰붿쐞 450~600, 湲곗??쒓컙 90遺? 蹂댁긽 405000G
            - ?쒖씠??6: ?ъ???5媛? ?ъ??섎떦 ?ㅽ꺈 踰붿쐞 175~225, ?ㅽ꺈 珥앺빀 踰붿쐞 525~675, 湲곗??쒓컙 240遺? 蹂댁긽 1350000G
                        
            異쒕젰 ?뺤떇:
            {
              "quests": [
                {
                  "title": "?섏뒪???쒕ぉ",
                  "description": "?섏뒪???ㅻ챸 (1~2臾몄옣)",
                  "difficulty": ?쒖씠??1~6),
                  "durationMinutes": 湲곗??쒓컙,
                  "rewardGold": 蹂댁긽怨⑤뱶,
                  "requiredSkills": [
                    {"skillType": "BE", "skillValue": ?レ옄},
                    {"skillType": "FE", "skillValue": ?レ옄},
                    {"skillType": "DEV", "skillValue": ?レ옄}
                  ]
                }
              ]
            }
            """;
}
