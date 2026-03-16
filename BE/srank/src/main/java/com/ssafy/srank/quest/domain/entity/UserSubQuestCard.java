package com.ssafy.srank.quest.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_sub_quest_card")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class UserSubQuestCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_sub_quest_card_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_sub_quest_id", nullable = false)
    private UserSubQuest userSubQuest;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_card_id", nullable = false)
    private Long userCardId;
}
