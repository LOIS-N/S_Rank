package com.ssafy.srank.card.application.service;

import com.ssafy.srank.card.application.dto.response.CursorPageResponse;
import com.ssafy.srank.card.application.dto.response.UserCardCursor;
import com.ssafy.srank.card.application.dto.response.UserCardFlatResponse;
import com.ssafy.srank.card.application.dto.response.UserCardResponse;
import com.ssafy.srank.card.domain.enums.PositionType;
import com.ssafy.srank.card.repository.UserCardQueryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserCardService {

    private static final int DEFAULT_LIMIT = 30;

    private final UserCardQueryRepository userCardQueryRepository;

    public CursorPageResponse<UserCardResponse> getUserCards(
            Long userId,
            PositionType statType,
            String cursorToken,
            int limit
    ) {
        UserCardCursor cursor = decodeCursor(cursorToken);
        int fetchLimit = (limit <= 0) ? DEFAULT_LIMIT : limit;

        List<UserCardFlatResponse> rows = userCardQueryRepository.findUserCards(
                userId, statType, cursor, fetchLimit
        );

        boolean hasMore = rows.size() > fetchLimit;
        List<UserCardFlatResponse> page = hasMore ? rows.subList(0, fetchLimit) : rows;

        List<UserCardResponse> cards = page.stream()
                .map(UserCardFlatResponse::toResponse)
                .toList();

        String nextCursor = hasMore ? encodeCursor(page.get(page.size() - 1)) : null;

        return new CursorPageResponse<>(cards, nextCursor, hasMore);
    }

    // ── cursor 인코딩/디코딩 ──────────────────────────────────────────────────

    /**
     * 커서 토큰 형식: Base64("gradePriority:totalStat:cardId")
     */
    private String encodeCursor(UserCardFlatResponse last) {
        int gradePriority = toGradePriority(last.grade());
        int totalStat = last.skillValue1() + last.skillValue2() + last.skillValue3();
        String raw = gradePriority + ":" + totalStat + ":" + last.cardId();
        return Base64.getEncoder().encodeToString(raw.getBytes());
    }

    private UserCardCursor decodeCursor(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            String raw = new String(Base64.getDecoder().decode(token));
            String[] parts = raw.split(":");
            int grade = Integer.parseInt(parts[0]);
            int totalStat = Integer.parseInt(parts[1]);
            long cardId = Long.parseLong(parts[2]);
            return new UserCardCursor(grade, totalStat, cardId);
        } catch (Exception e) {
            return null;
        }
    }

    private int toGradePriority(String grade) {
        return switch (grade) {
            case "S" -> 5;
            case "A" -> 4;
            case "B" -> 3;
            case "C" -> 2;
            default  -> 1;
        };
    }
}
