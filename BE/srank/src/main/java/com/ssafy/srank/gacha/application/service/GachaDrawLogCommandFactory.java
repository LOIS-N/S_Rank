package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.application.service.model.PreparedDraw;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.log.application.command.GachaDrawLogCommand;
import com.ssafy.srank.log.application.command.GachaDrawnCardLogCommand;
import com.ssafy.srank.log.domain.enums.BlockchainStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GachaDrawLogCommandFactory {

    public GachaDrawLogCommand create(
            Long userId,
            GachaType type,
            int count,
            long cost,
            String clientSeed,
            ProbablyFairContext pfContext,
            String anchorPayload,
            List<UserCard> savedCards,
            List<PreparedDraw> preparedDraws,
            LocalDateTime requestedAt
    ) {
        // draw 단위 로그와 카드별 로그를 함께 묶어 facade에 넘길 command를 만든다.
        return new GachaDrawLogCommand(
                userId,
                type,
                count,
                cost,
                clientSeed,
                pfContext.serverSeed(),
                pfContext.algorithmVersion(),
                anchorPayload,
                BlockchainStatus.PENDING,
                null,
                false,
                buildDrawnCardLogCommands(savedCards, preparedDraws),
                requestedAt
        );
    }

    private List<GachaDrawnCardLogCommand> buildDrawnCardLogCommands(
            List<UserCard> savedCards,
            List<PreparedDraw> preparedDraws
    ) {
        // 저장된 카드와 준비된 proof를 같은 인덱스로 매칭해 카드별 로그를 만든다.
        List<GachaDrawnCardLogCommand> commands = new ArrayList<>(savedCards.size());
        for (int i = 0; i < savedCards.size(); i++) {
            commands.add(toDrawnCardLogCommand(savedCards.get(i), preparedDraws.get(i)));
        }
        return commands;
    }

    private GachaDrawnCardLogCommand toDrawnCardLogCommand(
            UserCard userCard,
            PreparedDraw preparedDraw
    ) {
        // proof의 roll 정보와 저장된 카드 스냅샷을 하나의 로그 레코드로 변환한다.
        var proofItem = preparedDraw.proofItem();
        return new GachaDrawnCardLogCommand(
                proofItem.drawIndex(),
                proofItem.gradeRoll(),
                proofItem.templateRoll(),
                proofItem.skillRoll(),
                userCard.getId(),
                userCard.getCardTemplate().getGrade(),
                userCard.getCardTemplate().getId(),
                userCard.getStat1().getSkillType().name(),
                userCard.getStat1().getTotalValue(),
                userCard.getStat2().getSkillType().name(),
                userCard.getStat2().getTotalValue(),
                userCard.getStat3().getSkillType().name(),
                userCard.getStat3().getTotalValue(),
                userCard.getSpecialSkillTemplate() == null ? null : userCard.getSpecialSkillTemplate().getSkillCode()
        );
    }
}
