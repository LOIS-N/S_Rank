package com.ssafy.srank.quest.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_desk_quest")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class UserDeskQuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_desk_quest_id")
    private Long id;

    @Column(name = "user_desk_id", nullable = false)
    private Long userDeskId;

    @Column(name = "quest_type", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private QuestType questType;

    @Column(name = "quest_id", nullable = false)
    private Long questId;
}
