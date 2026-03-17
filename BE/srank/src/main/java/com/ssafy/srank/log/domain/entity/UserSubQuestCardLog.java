package com.ssafy.srank.log.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_sub_quest_card_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class UserSubQuestCardLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_main_quest_card_log_id")
    private Long userSubQuestCardLogId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_card_id", nullable = false)
    private Long userCardId;

    @Column(name = "skill_type1", nullable = false, length = 10)
    private String skillType1;

    @Column(name = "skill_value1", nullable = false)
    private int skillValue1;

    @Column(name = "skill_type2", nullable = false, length = 10)
    private String skillType2;

    @Column(name = "skill_value2", nullable = false)
    private int skillValue2;

    @Column(name = "skill_type3", nullable = false, length = 10)
    private String skillType3;

    @Column(name = "skill_value3", nullable = false)
    private int skillValue3;

    @Column(name = "special_skill_code", length = 30)
    private String specialSkillCode;

    @Column(name = "special_skill_type", length = 30)
    private String specialSkillType;

    @Column(name = "special_skill_value")
    private Integer specialSkillValue;
}
