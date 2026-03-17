package com.ssafy.srank.ranking.repository;

import com.ssafy.srank.ranking.domain.entity.CardStatTotalRankingSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardStatTotalRankingSnapshotRepository extends JpaRepository<CardStatTotalRankingSnapshot, Long> {

    List<CardStatTotalRankingSnapshot> findAllByOrderByRankAsc();
}
