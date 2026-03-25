package com.ssafy.srank.ranking.application.listener;

import com.ssafy.srank.ranking.application.event.GoldEarnedEvent;
import com.ssafy.srank.ranking.application.event.UserCardsChangedEvent;
import com.ssafy.srank.ranking.application.event.UserCardStatChangedEvent;
import com.ssafy.srank.ranking.application.event.UserWithdrawnEvent;
import com.ssafy.srank.ranking.application.service.RankingProjectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class RankingProjectionListener {

    private final RankingProjectionService rankingProjectionService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleGoldEarned(GoldEarnedEvent event) {
        rankingProjectionService.applyGoldEarned(event.userId(), event.amount());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserCardsChanged(UserCardsChangedEvent event) {
        rankingProjectionService.refreshUserCardGradeProjection(event.userId());
        rankingProjectionService.refreshUserCardStatProjection(event.userId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserCardStatChanged(UserCardStatChangedEvent event) {
        rankingProjectionService.refreshUserCardStatProjection(event.userId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserWithdrawn(UserWithdrawnEvent event) {
        rankingProjectionService.removeUserProjection(event.userId());
    }
}
