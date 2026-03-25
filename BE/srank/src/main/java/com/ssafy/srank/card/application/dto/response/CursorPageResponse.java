package com.ssafy.srank.card.application.dto.response;

import java.util.List;

public record CursorPageResponse<T>(
        List<T> cards,
        String nextCursor,
        boolean hasMore,
        int totalCnt
) {}