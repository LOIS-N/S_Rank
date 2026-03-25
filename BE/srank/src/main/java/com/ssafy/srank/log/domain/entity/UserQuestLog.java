package com.ssafy.srank.log.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_quest_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class UserQuestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_quest")
    private Long id;

    @Column(name = "duration")
    private Long duration;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "quest_type")
    private String questType; //SUB, MAIN

    @Column(name = "quest_template_id", nullable = false)
    private Long questTemplateId;

    @Column(name = "quest_id", nullable = false)
    private Long questId;

    @Column(name = "user_id", nullable = false)
    private Long userId;
}
