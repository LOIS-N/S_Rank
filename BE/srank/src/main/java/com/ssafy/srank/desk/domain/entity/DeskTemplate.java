package com.ssafy.srank.desk.domain.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "desk_template")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class DeskTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "desk_template_id")
    private Long id;

    @Column(name = "image", nullable = false, length = 500)
    private String image;

    @Column(name = "unlock_cost_gold", nullable = false)
    private int unlockCostGold;

    @Column(name = "required_level", nullable = false)
    private int requiredLevel;

    public boolean isUnlockable(int userLevel) {
        return userLevel >= this.requiredLevel;
    }
}
