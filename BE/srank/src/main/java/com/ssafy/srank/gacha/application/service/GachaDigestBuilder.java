package com.ssafy.srank.gacha.application.service;

import com.ssafy.srank.common.probablyfair.application.service.ProbablyFairService;
import com.ssafy.srank.common.probablyfair.domain.ProbablyFairContext;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawProofItemResponse;
import com.ssafy.srank.gacha.application.service.model.GachaProofMaterial;
import com.ssafy.srank.gacha.application.service.model.PreparedDraw;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import com.ssafy.srank.gacha.domain.policy.AnchorPayloadFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GachaDigestBuilder {

    private final ProbablyFairService probablyFairService;
    private final AnchorPayloadFactory anchorPayloadFactory;

    public GachaProofMaterial build(
            GachaType type,
            int count,
            String clientSeed,
            ProbablyFairContext pfContext,
            List<PreparedDraw> preparedDraws
    ) {
        // 준비된 draw에서 proof item을 모으고 digest와 anchor payload를 함께 계산한다.
        List<GachaDrawProofItemResponse> proofItems = preparedDraws.stream()
                .map(PreparedDraw::proofItem)
                .toList();
        String resultDigest = buildResultDigest(type, count, proofItems, preparedDraws);
        String anchorPayload = anchorPayloadFactory.createAnchorPayload(
                pfContext.serverSeed(),
                type,
                count,
                clientSeed,
                resultDigest,
                proofItems
        );

        return new GachaProofMaterial(proofItems, resultDigest, anchorPayload);
    }

    private String buildResultDigest(
            GachaType type,
            int count,
            List<GachaDrawProofItemResponse> proofItems,
            List<PreparedDraw> preparedDraws
    ) {
        // 최종 결과를 고정 문자열로 직렬화한 뒤 SHA-256으로 요약값을 만든다.
        StringBuilder builder = new StringBuilder(type.name())
                .append(':')
                .append(count);

        for (int i = 0; i < preparedDraws.size(); i++) {
            PreparedDraw draw = preparedDraws.get(i);
            GachaDrawProofItemResponse proofItem = proofItems.get(i);
            builder.append('|')
                    .append(proofItem.drawIndex())
                    .append(':')
                    .append(proofItem.selectedGrade())
                    .append(':')
                    .append(proofItem.selectedTemplateId())
                    .append(':')
                    .append(draw.userCard().getStat1().getSkillType())
                    .append(':')
                    .append(draw.userCard().getStat1().getTotalValue())
                    .append(':')
                    .append(draw.userCard().getStat2().getSkillType())
                    .append(':')
                    .append(draw.userCard().getStat2().getTotalValue())
                    .append(':')
                    .append(draw.userCard().getStat3().getSkillType())
                    .append(':')
                    .append(draw.userCard().getStat3().getTotalValue())
                    .append(':')
                    .append(proofItem.selectedSpecialSkillCode());
        }

        return probablyFairService.sha256Hex(builder.toString());
    }
}
