package com.ssafy.srank.ranking;

import com.ssafy.srank.auth.application.service.PrivyTokenService;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.ranking.domain.entity.CardStatTotalRankingSnapshot;
import com.ssafy.srank.ranking.domain.entity.UserCardGradeRankingSnapshot;
import com.ssafy.srank.ranking.domain.entity.UserGoldRankingSnapshot;
import com.ssafy.srank.ranking.repository.CardStatTotalRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.UserCardGradeRankingSnapshotRepository;
import com.ssafy.srank.ranking.repository.UserGoldRankingSnapshotRepository;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RankingControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserGoldRankingSnapshotRepository userGoldRankingSnapshotRepository;

    @Autowired
    private UserCardGradeRankingSnapshotRepository userCardGradeRankingSnapshotRepository;

    @Autowired
    private CardStatTotalRankingSnapshotRepository cardStatTotalRankingSnapshotRepository;

    @MockBean
    private PrivyTokenService privyTokenService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(User.builder()
                .privyId("did:privy:test-user")
                .email("test-user@test.com")
                .walletAddress("wallet-test-user")
                .nickname("tester")
                .build());

        when(privyTokenService.verifyAccessToken(any())).thenAnswer(invocation -> {
            String header = invocation.getArgument(0, String.class);
            if (header == null || !header.startsWith("Bearer ")) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
            return "did:privy:test-user";
        });
    }

    @AfterEach
    void tearDown() {
        userGoldRankingSnapshotRepository.deleteAllInBatch();
        userCardGradeRankingSnapshotRepository.deleteAllInBatch();
        cardStatTotalRankingSnapshotRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Test
    void goldRankingRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/rankings/gold"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AU001"));
    }

    @Test
    void goldRankingReturnsTopTenAndMyRanking() throws Exception {
        for (int rank = 1; rank <= 11; rank++) {
            userGoldRankingSnapshotRepository.save(UserGoldRankingSnapshot.builder()
                    .rank(rank)
                    .userId(100L + rank)
                    .nickname("gold-user-" + rank)
                    .gold(1000L - rank)
                    .snapshotAt(LocalDateTime.now())
                    .build());
        }

        userGoldRankingSnapshotRepository.save(UserGoldRankingSnapshot.builder()
                .rank(12)
                .userId(testUser.getUserId())
                .nickname(testUser.getNickname())
                .gold(100L)
                .snapshotAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/api/v1/rankings/gold")
                        .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.topRankings.length()").value(10))
                .andExpect(jsonPath("$.data.topRankings[0].rank").value(1))
                .andExpect(jsonPath("$.data.topRankings[0].nickname").value("gold-user-1"))
                .andExpect(jsonPath("$.data.topRankings[0].gold").value(999))
                .andExpect(jsonPath("$.data.myRanking.rank").value(12))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("tester"))
                .andExpect(jsonPath("$.data.myRanking.gold").value(100));
    }

    @Test
    void goldRankingReturnsUnrankedFallbackWhenSnapshotDoesNotContainUser() throws Exception {
        for (int rank = 1; rank <= 10; rank++) {
            userGoldRankingSnapshotRepository.save(UserGoldRankingSnapshot.builder()
                    .rank(rank)
                    .userId(100L + rank)
                    .nickname("gold-user-" + rank)
                    .gold(1000L - rank)
                    .snapshotAt(LocalDateTime.now())
                    .build());
        }

        mockMvc.perform(get("/api/v1/rankings/gold")
                        .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.topRankings.length()").value(10))
                .andExpect(jsonPath("$.data.myRanking.rank").value(9999))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("미등록"))
                .andExpect(jsonPath("$.data.myRanking.gold").value(0));
    }

    @Test
    void cardGradeRankingReturnsUnrankedFallbackWhenSnapshotDoesNotContainUser() throws Exception {
        for (int rank = 1; rank <= 10; rank++) {
            userCardGradeRankingSnapshotRepository.save(UserCardGradeRankingSnapshot.builder()
                    .rank(rank)
                    .userId(200L + rank)
                    .nickname("grade-user-" + rank)
                    .sCount(20L - rank)
                    .aCount(30L - rank)
                    .snapshotAt(LocalDateTime.now())
                    .build());
        }

        mockMvc.perform(get("/api/v1/rankings/cards/grade-count")
                        .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.topRankings.length()").value(10))
                .andExpect(jsonPath("$.data.myRanking.rank").value(9999))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("미등록"))
                .andExpect(jsonPath("$.data.myRanking.sCount").value(0))
                .andExpect(jsonPath("$.data.myRanking.aCount").value(0));
    }

    @Test
    void cardStatTotalRankingReturnsUnrankedFallbackWhenSnapshotDoesNotContainUser() throws Exception {
        for (int rank = 1; rank <= 10; rank++) {
            cardStatTotalRankingSnapshotRepository.save(CardStatTotalRankingSnapshot.builder()
                    .rank(rank)
                    .userId(300L + rank)
                    .nickname("stat-user-" + rank)
                    .statTotal(300 - rank)
                    .achievedAt(LocalDateTime.now().minusHours(rank))
                    .snapshotAt(LocalDateTime.now())
                    .build());
        }

        mockMvc.perform(get("/api/v1/rankings/cards/stat-total")
                        .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.topRankings.length()").value(10))
                .andExpect(jsonPath("$.data.myRanking.rank").value(9999))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("미등록"))
                .andExpect(jsonPath("$.data.myRanking.statTotal").value(0));
    }

    @Test
    void cardGradeRankingReturnsTopTenAndMyRanking() throws Exception {
        for (int rank = 1; rank <= 11; rank++) {
            userCardGradeRankingSnapshotRepository.save(UserCardGradeRankingSnapshot.builder()
                    .rank(rank)
                    .userId(200L + rank)
                    .nickname("grade-user-" + rank)
                    .sCount(20L - rank)
                    .aCount(30L - rank)
                    .snapshotAt(LocalDateTime.now())
                    .build());
        }

        userCardGradeRankingSnapshotRepository.save(UserCardGradeRankingSnapshot.builder()
                .rank(12)
                .userId(testUser.getUserId())
                .nickname(testUser.getNickname())
                .sCount(1L)
                .aCount(2L)
                .snapshotAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/api/v1/rankings/cards/grade-count")
                        .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.topRankings.length()").value(10))
                .andExpect(jsonPath("$.data.topRankings[0].rank").value(1))
                .andExpect(jsonPath("$.data.topRankings[0].nickname").value("grade-user-1"))
                .andExpect(jsonPath("$.data.topRankings[0].sCount").value(19))
                .andExpect(jsonPath("$.data.topRankings[0].aCount").value(29))
                .andExpect(jsonPath("$.data.myRanking.rank").value(12))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("tester"))
                .andExpect(jsonPath("$.data.myRanking.sCount").value(1))
                .andExpect(jsonPath("$.data.myRanking.aCount").value(2));
    }

    @Test
    void cardStatTotalRankingReturnsTopTenAndMyRanking() throws Exception {
        for (int rank = 1; rank <= 11; rank++) {
            cardStatTotalRankingSnapshotRepository.save(CardStatTotalRankingSnapshot.builder()
                    .rank(rank)
                    .userId(300L + rank)
                    .nickname("stat-user-" + rank)
                    .statTotal(300 - rank)
                    .achievedAt(LocalDateTime.now().minusHours(rank))
                    .snapshotAt(LocalDateTime.now())
                    .build());
        }

        cardStatTotalRankingSnapshotRepository.save(CardStatTotalRankingSnapshot.builder()
                .rank(12)
                .userId(testUser.getUserId())
                .nickname(testUser.getNickname())
                .statTotal(100)
                .achievedAt(LocalDateTime.now().minusDays(1))
                .snapshotAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/api/v1/rankings/cards/stat-total")
                        .header("Authorization", "Bearer valid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.topRankings.length()").value(10))
                .andExpect(jsonPath("$.data.topRankings[0].rank").value(1))
                .andExpect(jsonPath("$.data.topRankings[0].nickname").value("stat-user-1"))
                .andExpect(jsonPath("$.data.topRankings[0].statTotal").value(299))
                .andExpect(jsonPath("$.data.myRanking.rank").value(12))
                .andExpect(jsonPath("$.data.myRanking.nickname").value("tester"))
                .andExpect(jsonPath("$.data.myRanking.statTotal").value(100));
    }
}
