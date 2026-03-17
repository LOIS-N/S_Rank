package com.ssafy.srank.ranking.repository;

import com.ssafy.srank.ranking.domain.entity.UserGoldRankingSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserGoldRankingSnapshotRepository extends JpaRepository<UserGoldRankingSnapshot, Long> {

    List<UserGoldRankingSnapshot> findAllByOrderByRankAsc();
}
