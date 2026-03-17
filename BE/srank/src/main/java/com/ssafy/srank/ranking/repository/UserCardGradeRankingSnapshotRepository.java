package com.ssafy.srank.ranking.repository;

import com.ssafy.srank.ranking.domain.entity.UserCardGradeRankingSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserCardGradeRankingSnapshotRepository extends JpaRepository<UserCardGradeRankingSnapshot, Long> {

    List<UserCardGradeRankingSnapshot> findAllByOrderByRankAsc();
}
