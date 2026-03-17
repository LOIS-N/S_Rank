package com.ssafy.srank.card.domain.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Entity
@Table(
        name = "special_skill_template",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_special_skill_template_skill_code",
                        columnNames = "skill_code"
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SpecialSkillTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "special_skill_id")
    private Long id;

    @Column(name = "skill_code", nullable = false, length = 50)
    private String skillCode;

    @Column(name = "skill_name", nullable = false, length = 100)
    private String skillName;

    @Column(name = "description", nullable = false, length = 255)
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @OneToMany(mappedBy = "specialSkillTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SpecialSkillEffect> effects = new ArrayList<>();

    public SpecialSkillTemplate(
            String skillCode,
            String skillName,
            String description
    ) {
        this.skillCode = skillCode;
        this.skillName = skillName;
        this.description = description;
        this.active = true;
        this.deleted = false;
        this.createdAt = LocalDateTime.now();
    }

    public void addEffect(SpecialSkillEffect effect) {
        this.effects.add(effect);
        effect.assignTemplate(this);
    }

    public void softDelete() {
        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}