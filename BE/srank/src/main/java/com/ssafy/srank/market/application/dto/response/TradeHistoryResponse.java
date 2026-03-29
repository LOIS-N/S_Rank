package com.ssafy.srank.market.application.dto.response;

import com.ssafy.srank.market.domain.entity.MarketItem;

import java.time.LocalDateTime;

public record TradeHistoryResponse(
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
        Integer priceCoin,
        String historyType,
        String status,
        String role,
        LocalDateTime eventAt,
        LocalDateTime expiresAt
) {
    public static TradeHistoryResponse from(MarketItem item, Long userId) {
        var card = item.getUserCard();
        var template = card.getCardTemplate();

        String specialAbility = card.getSpecialSkillTemplate() != null
                ? card.getSpecialSkillTemplate().getSkillName()
                : null;

        String role = item.getSellerUserId().equals(userId) ? "SELLER" : "BUYER";

        String historyType = switch (item.getStatus()) {
            case SOLD -> "TRADE";
            case CANCELED -> "CANCEL";
            case EXPIRED -> "EXPIRE";
            default -> "REGISTER";
        };

        LocalDateTime eventAt = item.getSoldAt() != null
                ? item.getSoldAt()
                : item.getCreatedAt();

        return new TradeHistoryResponse(
                item.getMarketItemId(),
                card.getId(),
                template.getId(),
                template.getCharacterName(),
                template.getPortraitImageUrl(),
                new SkillResponse(
                        card.getStat1().getSkillType().name(),
                        card.getStat1().getTotalValue(),
                        card.getStat1().getBonusValue()
                ),
                new SkillResponse(
                        card.getStat2().getSkillType().name(),
                        card.getStat2().getTotalValue(),
                        card.getStat2().getBonusValue()
                ),
                new SkillResponse(
                        card.getStat3().getSkillType().name(),
                        card.getStat3().getTotalValue(),
                        card.getStat3().getBonusValue()
                ),
                specialAbility,
                card.getEnhanceTryCount(),
                card.getEnhanceSuccessCount(),
                template.getGrade().name(),
                item.getPriceCoin(),
                historyType,
                item.getStatus().name(),
                role,
                eventAt,
                item.getExpiresAt()
        );
    }
}
