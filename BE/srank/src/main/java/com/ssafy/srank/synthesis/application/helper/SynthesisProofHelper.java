package com.ssafy.srank.synthesis.application.helper;

import com.ssafy.srank.card.domain.entity.UserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.common.probablyfair.domain.ProofAlgorithmVersion;
import com.ssafy.srank.synthesis.application.dto.response.SynthesisProofResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SynthesisProofHelper {

    private final ProbablyFairService probablyFairService;

    public SynthesisProofResponse createProof(ProbablyFairContext context, String clientSeed) {
        return SynthesisProofResponse.of(
                context.algorithmVersion(),
                context.serverSeed(),
                clientSeed
        );
    }

    public SynthesisProofResponse createProof(
            ProofAlgorithmVersion algorithmVersion,
            String serverSeed,
            String clientSeed
    ) {
        return SynthesisProofResponse.of(algorithmVersion, serverSeed, clientSeed);
    }

    public String buildResultDigest(
            CardGrade sourceGrade,
            int cardCount,
            CardGrade resultGrade,
            UserCard resultCard
    ) {
        String raw = sourceGrade + ":" + cardCount + ":" + resultGrade + ":"
                + resultCard.getCardTemplate().getId() + ":"
                + resultCard.getStat1().getSkillType() + ":" + resultCard.getStat1().getTotalValue() + ":"
                + resultCard.getStat2().getSkillType() + ":" + resultCard.getStat2().getTotalValue() + ":"
                + resultCard.getStat3().getSkillType() + ":" + resultCard.getStat3().getTotalValue() + ":"
                + (resultCard.getSpecialSkillTemplate() == null ? null : resultCard.getSpecialSkillTemplate().getSkillCode());
        return probablyFairService.sha256Hex(raw);
    }
}
