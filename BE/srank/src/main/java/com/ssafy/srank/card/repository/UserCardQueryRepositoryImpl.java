package com.ssafy.srank.card.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.ssafy.srank.card.application.dto.response.UserCardCursor;
import com.ssafy.srank.card.application.dto.response.UserCardFlatResponse;
import com.ssafy.srank.card.domain.entity.QCardTemplate;
import com.ssafy.srank.card.domain.entity.QSpecialSkillTemplate;
import com.ssafy.srank.card.domain.entity.QUserCard;
import com.ssafy.srank.card.domain.enums.CardGrade;
import com.ssafy.srank.card.domain.enums.PositionType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserCardQueryRepositoryImpl implements UserCardQueryRepository {

    private final JPAQueryFactory queryFactory;

    private static final QUserCard userCard = QUserCard.userCard;
    private static final QCardTemplate cardTemplate = QCardTemplate.cardTemplate;
    private static final QSpecialSkillTemplate specialSkill = QSpecialSkillTemplate.specialSkillTemplate;

    @Override
    public List<UserCardFlatResponse> findUserCards(
            Long userId,
            PositionType statType,
            UserCardCursor cursor,
            int limit
    ) {
        return queryFactory
                .select(Projections.constructor(
                        UserCardFlatResponse.class,
                        userCard.id,
                        cardTemplate.grade.stringValue(),
                        cardTemplate.characterName,
                        cardTemplate.portraitImageUrl,

                        userCard.stat1.skillType,
                        userCard.stat1.baseValue.add(userCard.stat1.bonusValue),

                        userCard.stat2.skillType,
                        userCard.stat2.baseValue.add(userCard.stat2.bonusValue),

                        userCard.stat3.skillType,
                        userCard.stat3.baseValue.add(userCard.stat3.bonusValue),

                        specialSkill.skillName
                ))
                .from(userCard)
                .join(userCard.cardTemplate, cardTemplate)
                .leftJoin(userCard.specialSkillTemplate, specialSkill)
                .where(
                        userCard.userId.eq(userId),
                        userCard.isDeleted.isFalse(),
                        statTypeFilter(statType),
                        cursorCondition(cursor)
                )
                .orderBy(
                        gradePriority().desc(),
                        totalStat().desc(),
                        userCard.id.asc()
                )
                .limit(limit + 1L)
                .fetch();
    }

    private BooleanExpression statTypeFilter(PositionType statType) {
        if (statType == null) return null;

        return userCard.stat1.skillType.eq(statType)
                .or(userCard.stat2.skillType.eq(statType))
                .or(userCard.stat3.skillType.eq(statType));
    }

    private BooleanExpression cursorCondition(UserCardCursor cursor) {
        if (cursor == null) return null;

        return gradePriority().lt(cursor.grade())
                .or(
                        gradePriority().eq(cursor.grade())
                                .and(totalStat().lt(cursor.totalStat()))
                )
                .or(
                        gradePriority().eq(cursor.grade())
                                .and(totalStat().eq(cursor.totalStat()))
                                .and(userCard.id.gt(cursor.cardId()))
                );
    }

    private NumberExpression<Integer> totalStat() {
        return userCard.stat1.baseValue.add(userCard.stat1.bonusValue)
                .add(userCard.stat2.baseValue.add(userCard.stat2.bonusValue))
                .add(userCard.stat3.baseValue.add(userCard.stat3.bonusValue));
    }

    private NumberExpression<Integer> gradePriority() {
        return new CaseBuilder()
                .when(cardTemplate.grade.eq(CardGrade.S)).then(5)
                .when(cardTemplate.grade.eq(CardGrade.A)).then(4)
                .when(cardTemplate.grade.eq(CardGrade.B)).then(3)
                .when(cardTemplate.grade.eq(CardGrade.C)).then(2)
                .otherwise(1);
    }
}