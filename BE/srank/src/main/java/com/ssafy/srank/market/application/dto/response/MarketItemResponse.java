package com.ssafy.srank.market.application.dto.response;

import com.ssafy.srank.market.domain.entity.MarketItem;

import java.time.LocalDateTime;

public record MarketItemResponse(
        Long marketItemId,
        Long userCardId,
        Long cardTemplateId,
        String cardName,
        String imageUrl,
        SkillResponse skill1,
        SkillResponse skill2,
        SkillResponse skill3,
        String specialAbility,
        Integer enhanceTryCount,
        Integer enhanceSuccessCount,
        String grade,
        Long priceCoin,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {
    public static MarketItemResponse from(MarketItem item) {
        var card = item.getUserCard();
        var template = card.getCardTemplate();

        String specialAbility = card.getSpecialSkillTemplate() != null
                ? card.getSpecialSkillTemplate().getSkillName()
                : null;

        return new MarketItemResponse(
                item.getMarketItemId(),
                card.getId(),
                template.getId(),
                template.getCharacterName(),
                template.getPortraitImageUrl(),
                new SkillResponse(card.getStat1().getSkillType().name(), card.getStat1().getTotalValue(), card.getStat1().getBonusValue()),
                new SkillResponse(card.getStat2().getSkillType().name(), card.getStat2().getTotalValue(), card.getStat2().getBonusValue()),
                new SkillResponse(card.getStat3().getSkillType().name(), card.getStat3().getTotalValue(), card.getStat3().getBonusValue()),
                specialAbility,
                card.getEnhanceTryCount(),
                card.getEnhanceSuccessCount(),
                template.getGrade().name(),
                item.getPriceCoin(),
                item.getCreatedAt(),
                item.getExpiresAt()
        );
    }
}
