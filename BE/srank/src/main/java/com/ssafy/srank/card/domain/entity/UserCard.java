package com.ssafy.srank.card.domain.entity;

import com.ssafy.srank.common.entity.SoftDeleteEntity;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "user_card")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserCard extends SoftDeleteEntity {

    private static final int MAX_ENHANCE_TRY_COUNT = 7;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_card_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "card_template_id", nullable = false)
    private CardTemplate cardTemplate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "special_skill_id")
    private SpecialSkillTemplate specialSkillTemplate;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "skillType", column = @Column(name = "base_skill_type_1", nullable = false, length = 10)),
            @AttributeOverride(name = "baseValue", column = @Column(name = "base_skill_value_1", nullable = false)),
            @AttributeOverride(name = "bonusValue", column = @Column(name = "bonus_skill_value_1", nullable = false))
    })
    private SkillStat stat1;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "skillType", column = @Column(name = "base_skill_type_2", nullable = false, length = 10)),
            @AttributeOverride(name = "baseValue", column = @Column(name = "base_skill_value_2", nullable = false)),
            @AttributeOverride(name = "bonusValue", column = @Column(name = "bonus_skill_value_2", nullable = false))
    })
    private SkillStat stat2;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "skillType", column = @Column(name = "base_skill_type_3", nullable = false, length = 10)),
            @AttributeOverride(name = "baseValue", column = @Column(name = "base_skill_value_3", nullable = false)),
            @AttributeOverride(name = "bonusValue", column = @Column(name = "bonus_skill_value_3", nullable = false))
    })
    private SkillStat stat3;

    @Column(name = "enhance_try_count", nullable = false)
    private int enhanceTryCount;

    @Column(name = "enhance_success_count", nullable = false)
    private int enhanceSuccessCount;

    @Column(name = "nft_token_id", length = 255)
    private String nftTokenId;


    public UserCard(
            Long userId,
            CardTemplate cardTemplate,
            SpecialSkillTemplate specialSkillTemplate,
            SkillStat stat1,
            SkillStat stat2,
            SkillStat stat3,
            String nftTokenId
    ) {
        this.userId = userId;
        this.cardTemplate = cardTemplate;
        this.specialSkillTemplate = specialSkillTemplate;
        this.stat1 = stat1;
        this.stat2 = stat2;
        this.stat3 = stat3;
        this.enhanceTryCount = 0;
        this.enhanceSuccessCount = 0;
        this.nftTokenId = nftTokenId;
    }

    public int getEnhanceLevel() {
        return enhanceSuccessCount;
    }

    public int getRemainingEnhanceCount() {
        return MAX_ENHANCE_TRY_COUNT - enhanceTryCount;
    }

    public boolean canEnhance() {
        return !isDeleted() && enhanceTryCount < MAX_ENHANCE_TRY_COUNT;
    }

    public void applyEnhanceSuccess(int stat1BonusIncrease, int stat2BonusIncrease, int stat3BonusIncrease) {
        validateEnhancePossible();

        this.enhanceTryCount++;
        this.enhanceSuccessCount++;

        this.stat1.increaseBonusValue(stat1BonusIncrease);
        this.stat2.increaseBonusValue(stat2BonusIncrease);
        this.stat3.increaseBonusValue(stat3BonusIncrease);

    }

    public void applyEnhanceFail() {
        validateEnhancePossible();
        this.enhanceTryCount++;
    }

    private void validateEnhancePossible() {
        if (isDeleted()) {
            throw new BusinessException(ErrorCode.CARD_CANNOT_ENHANCE_DELETED);
        }
        if (enhanceTryCount >= MAX_ENHANCE_TRY_COUNT) {
            throw new BusinessException(ErrorCode.CARD_ENHANCE_TRY_EXCEEDED);
        }
    }
}