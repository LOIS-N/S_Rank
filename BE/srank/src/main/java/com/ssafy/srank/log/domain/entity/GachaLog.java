package com.ssafy.srank.log.domain.entity;

import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.enums.ProofAlgorithmVersion;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "gacha_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class GachaLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gacha_draw_id")
    private Long gachaDrawId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "request_id", nullable = false, length = 64)
    private String requestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "gacha_type", nullable = false, length = 20)
    private GachaType gachaType;

    @Column(name = "draw_count", nullable = false)
    private int drawCount;

    @Column(name = "draw_index", nullable = false)
    private int drawIndex;

    @Column(name = "user_card_id", nullable = false)
    private Long userCardId;

    @Column(name = "card_template_id", nullable = false)
    private Long cardTemplateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "Field", nullable = false, length = 1)
    private CardGrade grade;

    @Column(name = "grade_roll", nullable = false)
    private int gradeRoll;

    @Column(name = "template_roll", nullable = false)
    private int templateRoll;

    @Column(name = "skill_roll")
    private Integer skillRoll;

    @Column(name = "cost_gold", nullable = false)
    private int costGold;

    @Builder.Default
    @Column(name = "is_tutorial", nullable = false)
    private boolean tutorial = false;

    @Column(name = "skill_type1", nullable = false, length = 10)
    private String skillType1;

    @Column(name = "skill_value1", nullable = false)
    private int skillValue1;

    @Column(name = "skill_type2", nullable = false, length = 10)
    private String skillType2;

    @Column(name = "skill_value2", nullable = false)
    private int skillValue2;

    @Column(name = "skill_type3", nullable = false, length = 10)
    private String skillType3;

    @Column(name = "skill_value3", nullable = false)
    private int skillValue3;

    @Column(name = "special_skill_code", nullable = true, length = 30)
    private String specialSkillCode;

    @Column(name = "client_seed", nullable = false, length = 255)
    private String clientSeed;

    @Column(name = "server_seed_hash", nullable = false, length = 128)
    private String serverSeedHash;

    @Column(name = "revealed_server_seed", nullable = false, length = 128)
    private String revealedServerSeed;

    @Column(name = "request_nonce", nullable = false, length = 128)
    private String requestNonce;

    @Enumerated(EnumType.STRING)
    @Column(name = "algorithm_version", nullable = false, length = 20)
    private ProofAlgorithmVersion algorithmVersion;

    @Lob
    @Column(name = "anchor_payload")
    private String anchorPayload;

    @Enumerated(EnumType.STRING)
    @Column(name = "blockchain_status", nullable = false, length = 30)
    private BlockchainStatus blockchainStatus;

    @Column(name = "blockchain_tx_hash", length = 255)
    private String blockchainTxHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
