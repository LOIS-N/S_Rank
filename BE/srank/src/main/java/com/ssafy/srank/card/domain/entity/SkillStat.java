package com.ssafy.srank.card.domain.entity;

import com.ssafy.srank.card.domain.enums.PositionType;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SkillStat {

    @Enumerated(EnumType.STRING)
    private PositionType skillType;

    private int baseValue;

    private int bonusValue;

    public SkillStat(PositionType skillType, int baseValue, int bonusValue) {
        this.skillType = skillType;
        this.baseValue = baseValue;
        this.bonusValue = bonusValue;
    }

    public int getTotalValue() {
        return baseValue + bonusValue;
    }

    public void increaseBonusValue(int amount) {
        this.bonusValue += amount;
    }
}