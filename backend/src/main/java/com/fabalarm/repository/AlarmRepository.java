package com.fabalarm.repository;

import com.fabalarm.model.Alarm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AlarmRepository extends JpaRepository<Alarm, String> {

    @Query("SELECT a FROM Alarm a LEFT JOIN FETCH a.labels WHERE a.alarmTime >= :from AND a.alarmTime <= :to ORDER BY a.alarmTime DESC")
    List<Alarm> findByTimeRange(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT a FROM Alarm a LEFT JOIN FETCH a.labels WHERE a.id = :id")
    Alarm findByIdWithLabels(@Param("id") String id);
}
