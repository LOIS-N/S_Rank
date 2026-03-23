package com.ssafy.srank.gacha.domain.policy;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ssafy.srank.gacha.application.dto.response.GachaDrawProofItemResponse;
import com.ssafy.srank.gacha.domain.enums.GachaType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AnchorPayloadFactory {

    private final ObjectMapper objectMapper;

    /**
     * 현재는 BC를 직접 호출하지 않으므로, 나중에 그대로 보낼 수 있는 앵커 payload만 미리 저장한다.
     */
    public String createAnchorPayload(
            String serverSeed,
            GachaType type,
            int count,
            String clientSeed,
            String resultDigest,
            List<GachaDrawProofItemResponse> drawProofs
    ) {
        AnchorPayload payload = new AnchorPayload(
                serverSeed,
                type,
                count,
                clientSeed,
                resultDigest,
                drawProofs
        );
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize anchor payload", e);
        }
    }

    private record AnchorPayload(
            String serverSeed,
            GachaType gachaType,
            int drawCount,
            String clientSeed,
            String resultDigest,
            List<GachaDrawProofItemResponse> drawProofs
    ) {
    }
}
