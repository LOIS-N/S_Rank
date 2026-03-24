package com.ssafy.srank.synthesis.application.factory;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;
import com.ssafy.srank.log.application.command.SynthesisLogCommand;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class SynthesisLogCommandFactory {

    public SynthesisLogCommand create(
            Long userId,
            List<Long> sourceCardIds,
            UserCard resultCard,
            boolean success,
            int costGold,
            CardGrade sourceGrade,
            String clientSeed,
            String serverSeed,
            ProofAlgorithmVersion algorithmVersion,
            String policyVersion,
            int resultRoll,
            String resultDigest,
            LocalDateTime createdAt
    ) {
        return new SynthesisLogCommand(
                userId,
                sourceCardIds,
                resultCard.getId(),
                success,
                costGold,
                sourceGrade,
                clientSeed,
                serverSeed,
                algorithmVersion,
                policyVersion,
                resultRoll,
                resultDigest,
                createdAt
        );
    }
}
