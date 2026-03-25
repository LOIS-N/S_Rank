package com.ssafy.srank.card.domain.entity;

import com.ssafy.srank.card.application.dto.response.*;
import com.ssafy.srank.common.entity.SoftDeleteEntity;
import com.ssafy.srank.common.exception.BusinessException;
import com.ssafy.srank.common.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "user_card")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
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

    public int getEnhanceLevel() {
        return enhanceSuccessCount;
    }

    public int getRemainingEnhanceCount() {
        return MAX_ENHANCE_TRY_COUNT - enhanceTryCount;
    }

    public boolean canEnhance() {
        return !isDeleted() && enhanceTryCount < MAX_ENHANCE_TRY_COUNT;
    }

    public void applyEnhanceSuccess(int value1, int value2, int value3) {
        this.enhanceTryCount++;
        this.enhanceSuccessCount++;

        this.stat1.increaseBonusValue(value1);
        this.stat2.increaseBonusValue(value2);
        this.stat3.increaseBonusValue(value3);

    }

    public void applyEnhanceFail() {
        this.enhanceTryCount++;
    }

    public void consumeForSynthesis(LocalDateTime now) {
        if (isDeleted()) {
            throw new BusinessException(ErrorCode.CARD_DELETED);
        }
        softDelete(now);
    }

    public UserCardResponse toResponse() {
        SpecialAbilityResponse specialAbility = null;
        if (specialSkillTemplate != null) {
            var effects = specialSkillTemplate.getEffects().stream()
                    .map(e -> new SpecialSkillEffectResponse(
                            e.getEffectType(),
                            e.getEffectOperator(),
                            e.getEffectAmount(),
                            e.getTargetScope(),
                            e.getTargetPosition(),
                            e.getConditionType(),
                            e.getConditionValue(),
                            e.getConditionPosition(),
                            e.getPriority()
                    ))
                    .toList();
            specialAbility = new SpecialAbilityResponse(
                    specialSkillTemplate.getSkillName(),
                    specialSkillTemplate.getDescription(),
                    effects
            );
        }
        return new UserCardResponse(
                id,
                cardTemplate.getGrade().name(),
                cardTemplate.getCharacterName(),
                cardTemplate.getPortraitImageUrl(),
                new CardSkillResponse(stat1.getSkillType(), stat1.getTotalValue()),
                new CardSkillResponse(stat2.getSkillType(), stat2.getTotalValue()),
                new CardSkillResponse(stat3.getSkillType(), stat3.getTotalValue()),
                enhanceTryCount,
                enhanceSuccessCount,
                specialAbility
        );
    }
}
