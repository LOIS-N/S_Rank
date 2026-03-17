package com.ssafy.srank.gacha;

import com.ssafy.srank.auth.application.service.PrivyTokenService;
import com.ssafy.srank.card.domain.entity.CardTemplate;
import com.ssafy.srank.card.domain.entity.SkillStat;
import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.CardTemplateRepository;
import com.ssafy.srank.card.repository.UserCardRepository;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import com.ssafy.srank.gacha.domain.policy.GachaRandomProvider;
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
import static org.mockito.ArgumentMatchers.anyInt;
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

    @MockBean
    private PrivyTokenService privyTokenService;

    @MockBean
    private GachaRandomProvider gachaRandomProvider;

    private User user;

    @BeforeEach
    void setUp() {
        user = userRepository.save(User.builder()
                .privyId("did:privy:gacha-user")
                .email("gacha-user@test.com")
                .walletAddress("wallet-gacha-user")
                .nickname("drawer")
                .gold(200_000L)
                .build());

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

        when(privyTokenService.verifyAccessToken(any())).thenAnswer(invocation -> {
            String header = invocation.getArgument(0, String.class);
            if (header == null || !header.startsWith("Bearer ")) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED);
            }
            return "did:privy:gacha-user";
        });

        when(gachaRandomProvider.nextInt(anyInt())).thenReturn(0);
        when(gachaRandomProvider.nextDouble()).thenAnswer(invocation -> 0.05d);
    }

    @AfterEach
    void tearDown() {
        userCardRepository.deleteAllInBatch();
        cardTemplateRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    @Test
    void drawRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("AU001"));
    }

    @Test
    void flyerSingleDrawCreatesOneCardAndSpendsGold() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.gachaType").value("FLYER"))
                .andExpect(jsonPath("$.data.drawCount").value(1))
                .andExpect(jsonPath("$.data.spentGold").value(10000))
                .andExpect(jsonPath("$.data.remainingGold").value(190000))
                .andExpect(jsonPath("$.data.cards.length()").value(1))
                .andExpect(jsonPath("$.data.cards[0].grade").value("B"))
                .andExpect(jsonPath("$.data.cards[0].skill1.skillType").value("BE"))
                .andExpect(jsonPath("$.data.cards[0].skill1.value").value(40))
                .andExpect(jsonPath("$.data.cards[0].skill2.skillType").value("FE"))
                .andExpect(jsonPath("$.data.cards[0].skill2.value").value(40))
                .andExpect(jsonPath("$.data.cards[0].skill3.skillType").value("DEVOPS"))
                .andExpect(jsonPath("$.data.cards[0].skill3.value").value(40));

        assertThat(userCardRepository.countActiveByUserId(user.getUserId())).isEqualTo(1);
        assertThat(userRepository.findById(user.getUserId()).orElseThrow().getGold()).isEqualTo(190_000L);
    }

    @Test
    @Transactional
    void flyerTenDrawCreatesTenCardsAndSpendsDiscountedGold() throws Exception {
        when(gachaRandomProvider.nextDouble()).thenAnswer(invocation -> 0.95d);

        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":10}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.drawCount").value(10))
                .andExpect(jsonPath("$.data.spentGold").value(90000))
                .andExpect(jsonPath("$.data.remainingGold").value(110000))
                .andExpect(jsonPath("$.data.cards.length()").value(10));

        List<UserCard> cards = userCardRepository.findAll();
        assertThat(cards).hasSize(10);
        assertThat(cards)
                .extracting(card -> card.getCardTemplate().getGrade())
                .containsOnly(CardGrade.D);
        assertThat(cards)
                .flatExtracting(card -> List.of(
                        card.getStat1().getTotalValue(),
                        card.getStat2().getTotalValue(),
                        card.getStat3().getTotalValue()
                ))
                .allMatch(value -> value >= 1 && value <= 20);
        assertThat(userRepository.findById(user.getUserId()).orElseThrow().getGold()).isEqualTo(110_000L);
    }

    @Test
    void drawRejectsInvalidCount() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":2}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA001"));
    }

    @Test
    void drawRejectsLockedType() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"EXPO","count":1}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA003"));
    }

    @Test
    void drawRejectsInvalidType() throws Exception {
        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"UNKNOWN","count":1}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("GA004"));
    }

    @Test
    void drawRejectsInsufficientGold() throws Exception {
        User poorUser = userRepository.findById(user.getUserId()).orElseThrow();
        poorUser.spendGold(190_001L);
        userRepository.save(poorUser);

        mockMvc.perform(post("/api/v1/gacha/draws")
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1}
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
                    .userId(user.getUserId())
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
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":10}
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
                        .header("Authorization", "Bearer valid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"FLYER","count":1}
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("G001"));
    }
}
