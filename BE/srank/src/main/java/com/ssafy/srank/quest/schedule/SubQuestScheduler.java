package com.ssafy.srank.quest.schedule;

import com.ssafy.srank.quest.application.service.SubQuestScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubQuestScheduler {

    private final SubQuestScheduleService subQuestScheduleService;

    // 매일 자정 실행
    @Scheduled(cron = "0 0 0 * * *")
    public void generateDailySubQuests() {
        log.info("서브퀘스트 일일 생성 시작");

        for (int difficulty = 1; difficulty <= 6; difficulty++) {
            try {
                subQuestScheduleService.generateAndSave(difficulty);
            } catch (Exception e) {
                log.error("서브퀘스트 생성 실패 - difficulty: {} ", difficulty, e);
            }
        }

        log.info("서브퀘스트 일일 생성 완료");
    }
}