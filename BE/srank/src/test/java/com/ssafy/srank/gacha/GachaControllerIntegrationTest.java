package com.ssafy.srank.gacha;

import com.ssafy.srank.auth.application.service.PrivyTokenService;
import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.SpecialSkillEffect;
import com.ssafy.srank.card.domain.entity.SpecialSkillTemplate;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.ConditionType;
import com.ssafy.srank.card.domain.enums.EffectOperator;
import com.ssafy.srank.card.domain.enums.EffectType;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.domain.enums.TargetScope;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.SpecialSkillTemplateRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;
import com.ssafy.srank.gacha.domain.policy.ProvablyFairContext;
import com.ssafy.srank.gacha.domain.policy.ProvablyFairContextFactory;
import com.ssafy.srank.log.domain.enums.GoldLogReason;
import com.ssafy.srank.log.repository.GachaLogRepository;
import com.ssafy.srank.log.repository.UserGoldLogRepository;
import com.ssafy.srank.user.domain.entity.User;
import com.ssafy.srank.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GachaControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserCardRepository userCardRepository;

    @Autowired
    private CardTemplateRepository cardTemplateRepository;

    @Autowired
    private SpecialSkillTemplateRepository specialSkillTemplateRepository;

    @Autowired
    private UserGoldLogRepository userGoldLogRepository;

    @Autowired
    private GachaLogRepository gachaLogRepository;

    @MockBean
    private PrivyTokenService privyTokenService;

    @MockBean
    private ProvablyFairContextFactory provablyFairContextFactory;

    private User highLevelUser;
    private User lowLevelUser;

    @BeforeEach
    void setUp() {
        highLevelUser = userRepository.save(User.builder()
                .privyId("did:privy:gacha-user")
                .email("gacha-user@test.com")
                .walletAddress("wallet-gacha-user")
                .nickname("drawer")
                .level(5)
                .gold(500_000L)
                .build());
        lowLevelUser = userRepository.save(User.builder()
                .privyId("did:privy:gacha-user-low")
                .email("gacha-user-low@test.com")
                .walletAddress("wallet-gacha-user-low")
                .nickname("drawer-low")
                .level(1)
                .gold(200_000L)
                .build());

        cardTemplateRepository.save(new CardTemplate(
                CardGrade.S,
                "S Candidate",
                "/assets/cards/frame/sRank/S_1.png",
                "/assets/cards/portrait/sRank/S_1.png"
        ));
        cardTemplateRepository.save(new CardTemplate(
                CardGrade.A,
                "A Candidate",
                "/assets/cards/frame/aRank/A_1.png",
                "/assets/cards/portrait/aRank/A_1.png"
        ));
        cardTemplateRepository.save(new CardTemplate(
                CardGrade.B,
                "B Candidate",
                "/assets/cards/frame/bRank/B_1.png",
                "/assets/cards/portrait/bRank/B_1.png"
        ));
        cardTemplateRepository.save(new CardTemplate(
                CardGrade.C,
                "C Candidate",
                "/assets/cards/frame/cRank/C_1.png",
                "/assets/cards/portrait/cRank/C_1.png"
        ));
        cardTemplateRepository.save(new CardTemplate(
                CardGrade.D,
                "D Candidate",
                "/assets/cards/frame/dRank/D_1.png",
                "/assets/cards/portrait/dRank/D_1.png"
        ));

        SpecialSkillTemplate genericSkill = new SpecialSkillTemplate("SKILL-GENERIC", "워커홀릭", "담당 포지션 수행 속도 +20%");
        genericSkill.addEffect(new SpecialSkillEffect(
                EffectType.WORK_SPEED,
                EffectOperator.PERCENT,
                20,
                TargetScope.SELF,
                null,
                ConditionType.NONE,
                null,
                null,
                1
        ));
        specialSkillTemplateRepository.save(genericSkill);

        SpecialSkillTemplate beSkill = new SpecialSkillTemplate("SKILL-BE", "BE 스페셜리스트", "BE 포지션 담당 시 수행 속도 +18%");
        beSkill.addEffect(new SpecialSkillEffect(
                EffectType.WORK_SPEED,
                EffectOperator.PERCENT,
                18,
                TargetScope.ASSIGNED_POSITION_CARD,
                PositionType.BE,
                ConditionType.WHEN_ASSIGNED_TO_POSITION,
                null,
                PositionType.BE,
                1
        ));
        specialSkillTemplateRepository.save(beSkill);

        when(privyTokenService.verifyAccessToken(any())).thenAnswer(invocation -> {
            String header = invocation.getArgument(0, String.class);
            if (header == null || !header.startsWith("Bearer ")) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
            return switch (header) {
                case "Bearer valid-high" -> "did:privy:gacha-user";
                case "Bearer valid-low" -> "did:privy:gacha-user-low";
                default -> throw new BusinessException(ErrorCode.UNAUTHORIZED);
            };
        });
        when(provablyFairContextFactory.create()).thenReturn(new ProvablyFairContext(
                "req-test-1",
                "server-seed-test",
                "8f25fbec3db8c6d4adca4d4a3fcd27c3f29d59c3470df71c2d30e0e27f1c5022",
                "nonce-test-1",
                ProofAlgorithmVersion.PF_V1
        ));
    }

    @AfterEach
    void tearDown() {
        gachaLogRepository.deleteAllInBatch();
        userGoldLogRepository.deleteAllInBatch();
        userCardRepository.deleteAllInBatch();
        specialSkillTemplateRepository.deleteAllInBatch();
        cardTemplateRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Test
    void drawRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1,"clientSeed":"seed-auth"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AU001"));
    }

    @Test
    void flyerSingleDrawCreatesOneCardAndSpendsGold() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1,"clientSeed":"seed-flyer-1"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.gachaType").value("FLYER"))
                .andExpect(jsonPath("$.data.drawCount").value(1))
                .andExpect(jsonPath("$.data.spentGold").value(10000))
                .andExpect(jsonPath("$.data.remainingGold").value(490000))
                .andExpect(jsonPath("$.data.cards.length()").value(1))
                .andExpect(jsonPath("$.data.proof.requestId").value("req-test-1"))
                .andExpect(jsonPath("$.data.proof.algorithmVersion").value("PF_V1"))
                .andExpect(jsonPath("$.data.proof.revealedServerSeed").value("server-seed-test"))
                .andExpect(jsonPath("$.data.proof.clientSeed").value("seed-flyer-1"))
                .andExpect(jsonPath("$.data.proof.drawProofs.length()").value(1))
                .andExpect(jsonPath("$.data.blockchainStatus").value("NOT_REQUESTED"));

        assertThat(userCardRepository.countActiveByUserId(highLevelUser.getUserId())).isEqualTo(1);
        assertThat(userRepository.findById(highLevelUser.getUserId()).orElseThrow().getGold()).isEqualTo(490_000L);
        assertThat(userGoldLogRepository.findAll()).hasSize(1);
        assertThat(userGoldLogRepository.findAll().get(0).getReason()).isEqualTo(GoldLogReason.GACHA_SPEND);
        assertThat(gachaLogRepository.findAll()).hasSize(1);
        assertThat(gachaLogRepository.findAll().get(0).getClientSeed()).isEqualTo("seed-flyer-1");
    }

    @Test
    @Transactional
    void flyerTenDrawCreatesTenCardsAndSpendsDiscountedGold() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":10,"clientSeed":"seed-flyer-10"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.drawCount").value(10))
                .andExpect(jsonPath("$.data.spentGold").value(90000))
                .andExpect(jsonPath("$.data.remainingGold").value(410000))
                .andExpect(jsonPath("$.data.cards.length()").value(10))
                .andExpect(jsonPath("$.data.proof.drawProofs.length()").value(10));

        List<UserCard> cards = userCardRepository.findAll();
        assertThat(cards).hasSize(10);
        assertThat(userRepository.findById(highLevelUser.getUserId()).orElseThrow().getGold()).isEqualTo(410_000L);
        assertThat(userGoldLogRepository.findAll()).hasSize(1);
        assertThat(userGoldLogRepository.findAll().get(0).getAmount()).isEqualTo(-90_000L);
        assertThat(gachaLogRepository.findAll()).hasSize(10);
        assertThat(gachaLogRepository.findAll())
                .extracting(log -> log.getRequestId())
                .containsOnly("req-test-1");
    }

    @Test
    void drawRejectsInvalidCount() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":2,"clientSeed":"seed-invalid-count"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA001"));

        assertThat(userGoldLogRepository.count()).isZero();
        assertThat(gachaLogRepository.count()).isZero();
    }

    @Test
    void drawRejectsLockedType() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-low")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"EXPO","count":1,"clientSeed":"seed-expo"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA003"));
    }

    @Test
    void drawRejectsInvalidType() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"UNKNOWN","count":1,"clientSeed":"seed-invalid-type"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA004"));
    }

    @Test
    void drawAcceptsLowercaseType() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"flyer","count":1,"clientSeed":"seed-lowercase"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.gachaType").value("FLYER"));
    }

    @Test
    void drawRejectsInsufficientGold() throws Exception {
        User poorUser = userRepository.findById(highLevelUser.getUserId()).orElseThrow();
        poorUser.spendGold(490_001L);
        userRepository.save(poorUser);

        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1,"clientSeed":"seed-poor"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA002"));
    }

    @Test
    void drawRejectsInventoryOverflow() throws Exception {
        CardTemplate template = cardTemplateRepository.findAllByGradeAndActiveTrueAndHiddenFalseAndDeletedFalse(CardGrade.B)
                .get(0);
        List<UserCard> cards = new ArrayList<>();
        for (int i = 0; i < 191; i++) {
            cards.add(UserCard.builder()
                    .userId(highLevelUser.getUserId())
                    .cardTemplate(template)
                    .stat1(new SkillStat(PositionType.BE, 40, 0))
                    .stat2(new SkillStat(PositionType.FE, 40, 0))
                    .stat3(new SkillStat(PositionType.DEVOPS, 40, 0))
                    .enhanceTryCount(0)
                    .enhanceSuccessCount(0)
                    .build());
        }
        userCardRepository.saveAll(cards);

        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":10,"clientSeed":"seed-overflow"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA005"));
    }

    @Test
    void drawFailsFastWhenGradeHasNoTemplate() throws Exception {
        cardTemplateRepository.deleteAllInBatch();
        cardTemplateRepository.save(new CardTemplate(
                CardGrade.C,
                "C Candidate",
                "/assets/cards/frame/cRank/C_1.png",
                "/assets/cards/portrait/cRank/C_1.png"
        ));
        cardTemplateRepository.save(new CardTemplate(
                CardGrade.D,
                "D Candidate",
                "/assets/cards/frame/dRank/D_1.png",
                "/assets/cards/portrait/dRank/D_1.png"
        ));

        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1,"clientSeed":"seed-no-template"}
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("G001"));
    }

    @Test
    void expoDrawSucceedsForUnlockedUser() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"EXPO","count":1,"clientSeed":"seed-expo-ok"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.gachaType").value("EXPO"))
                .andExpect(jsonPath("$.data.spentGold").value(15000))
                .andExpect(jsonPath("$.data.proof.drawProofs.length()").value(1));
    }

    @Test
    void openRecruitDrawSucceedsForUnlockedUser() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid-high")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"OPEN_RECRUIT","count":10,"clientSeed":"seed-open-recruit"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.gachaType").value("OPEN_RECRUIT"))
                .andExpect(jsonPath("$.data.spentGold").value(360000))
                .andExpect(jsonPath("$.data.proof.drawProofs.length()").value(10));
    }

    @Test
    void verificationEndpointReplaysCardsWithoutAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/verifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type":"FLYER",
                                  "count":1,
                                  "requestId":"req-test-1",
                                  "clientSeed":"seed-flyer-1",
                                  "revealedServerSeed":"server-seed-test",
                                  "serverSeedHash":"8f25fbec3db8c6d4adca4d4a3fcd27c3f29d59c3470df71c2d30e0e27f1c5022",
                                  "requestNonce":"nonce-test-1",
                                  "algorithmVersion":"PF_V1"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cards.length()").value(1))
                .andExpect(jsonPath("$.data.gachaType").value("FLYER"))
                .andExpect(jsonPath("$.data.drawCount").value(1))
                .andExpect(jsonPath("$.data.serverSeedHashVerified").value(true))
                .andExpect(jsonPath("$.data.proof.requestId").value("req-test-1"));
    }
}
