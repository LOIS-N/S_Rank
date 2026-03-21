package com.ssafy.srank.ranking;

import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.log.domain.entity.EnhancementLog;
import com.ssafy.srank.log.domain.entity.UserGoldLog;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.log.repository.EnhancementLogRepository;
import com.ssafy.srank.log.repository.UserGoldLogRepository;
import com.ssafy.srank.ranking.batch.RankingBatchConfig;
import com.ssafy.srank.ranking.repository.CardStatTotalRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.UserCardGradeRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.UserGoldRankingSnapshotRepository;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.batch.core.Job;
import org.springframework.batch.core.JobExecution;
import org.springframework.batch.core.JobParametersBuilder;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class RankingBatchIntegrationTest {

    @Autowired
    private JobLauncher jobLauncher;

    @Autowired
    @Qualifier(RankingBatchConfig.RANKING_SNAPSHOT_JOB)
    private Job rankingSnapshotJob;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CardTemplateRepository cardTemplateRepository;

    @Autowired
    private UserCardRepository userCardRepository;

    @Autowired
    private UserGoldLogRepository userGoldLogRepository;

    @Autowired
    private EnhancementLogRepository enhancementLogRepository;

    @Autowired
    private UserGoldRankingSnapshotRepository userGoldRankingSnapshotRepository;

    @Autowired
    private UserCardGradeRankingSnapshotRepository userCardGradeRankingSnapshotRepository;

    @Autowired
    private CardStatTotalRankingSnapshotRepository cardStatTotalRankingSnapshotRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void tearDown() {
        userGoldRankingSnapshotRepository.deleteAllInBatch();
        userCardGradeRankingSnapshotRepository.deleteAllInBatch();
        cardStatTotalRankingSnapshotRepository.deleteAllInBatch();
        enhancementLogRepository.deleteAllInBatch();
        userGoldLogRepository.deleteAllInBatch();
        userCardRepository.deleteAllInBatch();
        cardTemplateRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Test
    void rankingBatchBuildsAllSnapshotsWithConfiguredRules() throws Exception {
        User alpha = saveUser("did:privy:alpha", "alpha", null);
        User beta = saveUser("did:privy:beta", "beta", null);
        User gamma = saveUser("did:privy:gamma", "gamma", null);
        User delta = saveUser("did:privy:delta", "delta", null);
        User withdrawn = saveUser("did:privy:withdrawn", "withdrawn", LocalDateTime.now());

        LocalDateTime alphaCreatedAt = LocalDateTime.now().minusDays(10);
        LocalDateTime betaCreatedAt = LocalDateTime.now().minusDays(9);
        LocalDateTime gammaCreatedAt = LocalDateTime.now().minusDays(8);
        LocalDateTime deltaCreatedAt = LocalDateTime.now().minusDays(7);

        updateUserCreatedAt(alpha.getUserId(), alphaCreatedAt);
        updateUserCreatedAt(beta.getUserId(), betaCreatedAt);
        updateUserCreatedAt(gamma.getUserId(), gammaCreatedAt);
        updateUserCreatedAt(delta.getUserId(), deltaCreatedAt);

        userGoldLogRepository.save(UserGoldLog.builder()
                .userId(alpha.getUserId())
                .amount(100)
                .balanceAfter(100)
                .reason(GoldLogReason.QUEST_REWARD)
                .createdAt(LocalDateTime.now().minusHours(5))
                .build());
        userGoldLogRepository.save(UserGoldLog.builder()
                .userId(alpha.getUserId())
                .amount(-20)
                .balanceAfter(80)
                .reason(GoldLogReason.GACHA_SPEND)
                .createdAt(LocalDateTime.now().minusHours(4))
                .build());
        userGoldLogRepository.save(UserGoldLog.builder()
                .userId(beta.getUserId())
                .amount(100)
                .balanceAfter(100)
                .reason(GoldLogReason.QUEST_REWARD)
                .createdAt(LocalDateTime.now().minusHours(3))
                .build());
        userGoldLogRepository.save(UserGoldLog.builder()
                .userId(withdrawn.getUserId())
                .amount(500)
                .balanceAfter(500)
                .reason(GoldLogReason.QUEST_REWARD)
                .createdAt(LocalDateTime.now().minusHours(2))
                .build());

        CardTemplate activeS = cardTemplateRepository.save(new CardTemplate(CardGrade.S, "S-Card", "frame-s", "portrait-s"));
        CardTemplate activeA = cardTemplateRepository.save(new CardTemplate(CardGrade.A, "A-Card", "frame-a", "portrait-a"));
        CardTemplate highCard = cardTemplateRepository.save(new CardTemplate(CardGrade.B, "High Card", "frame-h", "portrait-h"));
        CardTemplate tieCard = cardTemplateRepository.save(new CardTemplate(CardGrade.B, "Tie Card", "frame-t", "portrait-t"));
        CardTemplate hiddenCard = cardTemplateRepository.save(new CardTemplate(CardGrade.S, "Hidden Card", "frame-hidden", "portrait-hidden"));

        hideTemplate(hiddenCard.getId());

        userCardRepository.save(saveCard(alpha.getUserId(), activeS, 40, 40, 40, 0, 0, 0));
        userCardRepository.save(saveCard(beta.getUserId(), activeS, 45, 45, 45, 0, 0, 0));
        userCardRepository.save(saveCard(beta.getUserId(), activeA, 20, 20, 20, 0, 0, 0));
        userCardRepository.save(saveCard(alpha.getUserId(), hiddenCard, 30, 30, 30, 0, 0, 0));

        UserCard deletedCard = userCardRepository.save(saveCard(alpha.getUserId(), activeA, 10, 10, 10, 0, 0, 0));
        softDeleteCard(deletedCard.getId());

        userCardRepository.save(saveCard(withdrawn.getUserId(), activeS, 50, 50, 50, 0, 0, 0));

        UserCard highestStatCard = userCardRepository.save(saveCard(gamma.getUserId(), highCard, 70, 70, 40, 0, 0, 0));
        UserCard olderTieCard = userCardRepository.save(saveCard(alpha.getUserId(), tieCard, 50, 50, 50, 0, 0, 0));
        UserCard alphaLaterTieCard = userCardRepository.save(saveCard(alpha.getUserId(), tieCard, 40, 40, 40, 10, 10, 10));
        UserCard betaTieCard = userCardRepository.save(saveCard(beta.getUserId(), tieCard, 40, 40, 40, 10, 10, 10));

        LocalDateTime oldCreatedAt = LocalDateTime.now().minusDays(2);
        LocalDateTime alphaLaterCreatedAt = LocalDateTime.now().minusDays(1);
        LocalDateTime betaBaseCreatedAt = LocalDateTime.now().minusHours(12);
        LocalDateTime successAt = LocalDateTime.now().minusHours(6);
        LocalDateTime gammaCardCreatedAt = LocalDateTime.now().minusHours(8);

        updateCardCreatedAt(olderTieCard.getId(), oldCreatedAt);
        updateCardCreatedAt(alphaLaterTieCard.getId(), alphaLaterCreatedAt);
        updateCardCreatedAt(betaTieCard.getId(), betaBaseCreatedAt);
        updateCardCreatedAt(highestStatCard.getId(), gammaCardCreatedAt);

        enhancementLogRepository.save(EnhancementLog.builder()
                .userId(beta.getUserId())
                .userCardId(betaTieCard.getId())
                .tryNo(1)
                .success(true)
                .beforeSuccessCount(0)
                .afterSuccessCount(1)
                .increasedSkillType1(PositionType.BE)
                .increasedAmount1(10)
                .increasedSkillType2(PositionType.FE)
                .increasedAmount2(10)
                .increasedSkillType3(PositionType.BE)
                .increasedAmount3(10)
                .costGold(100)
                .createdAt(successAt)
                .build());

        JobExecution execution = jobLauncher.run(rankingSnapshotJob, new JobParametersBuilder()
                .addLong("timestamp", System.currentTimeMillis())
                .toJobParameters());

        assertThat(execution.getExitStatus().getExitCode()).isEqualTo("COMPLETED");

        var goldSnapshots = userGoldRankingSnapshotRepository.findAllByOrderByRankAsc();
        assertThat(goldSnapshots).hasSize(4);
        assertThat(goldSnapshots.get(0).getNickname()).isEqualTo("alpha");
        assertThat(goldSnapshots.get(0).getGold()).isEqualTo(100L);
        assertThat(goldSnapshots.get(1).getNickname()).isEqualTo("beta");
        assertThat(goldSnapshots.get(1).getGold()).isEqualTo(100L);
        assertThat(goldSnapshots.get(2).getNickname()).isEqualTo("gamma");
        assertThat(goldSnapshots.get(2).getGold()).isEqualTo(0L);
        assertThat(goldSnapshots.get(3).getNickname()).isEqualTo("delta");
        assertThat(goldSnapshots.get(3).getGold()).isEqualTo(0L);

        var gradeSnapshots = userCardGradeRankingSnapshotRepository.findAllByOrderByRankAsc();
        assertThat(gradeSnapshots).hasSize(4);
        assertThat(gradeSnapshots.get(0).getNickname()).isEqualTo("beta");
        assertThat(gradeSnapshots.get(0).getSCount()).isEqualTo(1L);
        assertThat(gradeSnapshots.get(0).getACount()).isEqualTo(1L);
        assertThat(gradeSnapshots.get(1).getNickname()).isEqualTo("alpha");
        assertThat(gradeSnapshots.get(1).getSCount()).isEqualTo(1L);
        assertThat(gradeSnapshots.get(1).getACount()).isEqualTo(0L);
        assertThat(gradeSnapshots.get(2).getNickname()).isEqualTo("gamma");
        assertThat(gradeSnapshots.get(2).getSCount()).isEqualTo(0L);
        assertThat(gradeSnapshots.get(2).getACount()).isEqualTo(0L);
        assertThat(gradeSnapshots.get(3).getNickname()).isEqualTo("delta");
        assertThat(gradeSnapshots.get(3).getSCount()).isEqualTo(0L);
        assertThat(gradeSnapshots.get(3).getACount()).isEqualTo(0L);

        var statSnapshots = cardStatTotalRankingSnapshotRepository.findAllByOrderByRankAsc();
        assertThat(statSnapshots).hasSize(4);
        assertThat(statSnapshots.get(0).getNickname()).isEqualTo("gamma");
        assertThat(statSnapshots.get(0).getStatTotal()).isEqualTo(180);
        assertThat(statSnapshots.get(0).getAchievedAt()).isEqualTo(gammaCardCreatedAt);
        assertThat(statSnapshots.get(1).getNickname()).isEqualTo("alpha");
        assertThat(statSnapshots.get(1).getStatTotal()).isEqualTo(150);
        assertThat(statSnapshots.get(1).getAchievedAt()).isEqualTo(oldCreatedAt);
        assertThat(statSnapshots.get(2).getNickname()).isEqualTo("beta");
        assertThat(statSnapshots.get(2).getStatTotal()).isEqualTo(150);
        assertThat(statSnapshots.get(2).getAchievedAt()).isEqualTo(successAt);
        assertThat(statSnapshots.get(3).getNickname()).isEqualTo("delta");
        assertThat(statSnapshots.get(3).getStatTotal()).isEqualTo(0);
        assertThat(statSnapshots.get(3).getAchievedAt()).isEqualTo(deltaCreatedAt);
        assertThat(statSnapshots).noneMatch(snapshot -> snapshot.getNickname().equals("withdrawn"));
    }

    private User saveUser(String privyId, String nickname, LocalDateTime deletedAt) {
        return userRepository.save(User.builder()
                .privyId(privyId)
                .email(privyId + "@test.com")
                .walletAddress("wallet-" + privyId)
                .nickname(nickname)
                .deletedAt(deletedAt)
                .build());
    }

    private UserCard saveCard(Long userId, CardTemplate template,
                              int base1, int base2, int base3,
                              int bonus1, int bonus2, int bonus3) {
        return UserCard.builder()
                .userId(userId)
                .cardTemplate(template)
                .stat1(new SkillStat(PositionType.BE, base1, bonus1))
                .stat2(new SkillStat(PositionType.FE, base2, bonus2))
                .stat3(new SkillStat(PositionType.BE, base3, bonus3))
                .enhanceTryCount(0)
                .enhanceSuccessCount(0)
                .build();
    }

    private void hideTemplate(Long templateId) {
        jdbcTemplate.update("UPDATE card_template SET is_hidden = true WHERE card_template_id = ?", templateId);
    }

    private void softDeleteCard(Long userCardId) {
        jdbcTemplate.update("UPDATE user_card SET is_delete = true WHERE user_card_id = ?", userCardId);
    }

    private void updateCardCreatedAt(Long userCardId, LocalDateTime createdAt) {
        jdbcTemplate.update("UPDATE user_card SET created_at = ? WHERE user_card_id = ?", createdAt, userCardId);
    }

    private void updateUserCreatedAt(Long userId, LocalDateTime createdAt) {
        jdbcTemplate.update("UPDATE users SET created_at = ? WHERE user_id = ?", createdAt, userId);
    }
}
