package com.ssafy.srank.quest.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_main_quest_card")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class UserMainQuestCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_main_quest_card_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_main_quest_id", nullable = false)
    private UserMainQuest userMainQuest;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_card_id", nullable = false)
    private Long userCardId;
}
