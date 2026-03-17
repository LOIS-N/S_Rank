package com.ssafy.srank.card.domain.entity;

import com.ssafy.srank.card.domain.enums.CardGrade;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "card_template",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_card_template_grade_character_name",
                        columnNames = {"grade", "character_name"}
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CardTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "card_template_id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "grade", nullable = false, length = 1)
    private CardGrade grade;

    @Column(name = "character_name", nullable = false, length = 100)
    private String characterName;

    @Column(name = "frame_image_url", nullable = false, length = 500)
    private String frameImageUrl;

    @Column(name = "portrait_image_url", nullable = false, length = 500)
    private String portraitImageUrl;

    @Column(name = "is_hidden", nullable = false)
    private boolean hidden;

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

    public CardTemplate(
            CardGrade grade,
            String characterName,
            String frameImageUrl,
            String portraitImageUrl
    ) {
        this.grade = grade;
        this.characterName = characterName;
        this.frameImageUrl = frameImageUrl;
        this.portraitImageUrl = portraitImageUrl;
        this.hidden = false;
        this.active = true;
        this.deleted = false;
        this.createdAt = LocalDateTime.now();
    }

    public void softDelete() {
        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}