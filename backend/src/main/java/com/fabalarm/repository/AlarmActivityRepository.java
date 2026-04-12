package com.fabalarm.repository;

import com.fabalarm.model.AlarmActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlarmActivityRepository extends JpaRepository<AlarmActivity, Long> {

    List<AlarmActivity> findByAlarmIdOrderByTimestampAsc(String alarmId);
}
