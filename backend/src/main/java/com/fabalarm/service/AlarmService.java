package com.fabalarm.service;

import com.fabalarm.model.*;
import com.fabalarm.repository.AlarmActivityRepository;
import com.fabalarm.repository.AlarmRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AlarmService {

    private final AlarmRepository alarmRepository;
    private final AlarmActivityRepository alarmActivityRepository;

    public AlarmService(AlarmRepository alarmRepository, AlarmActivityRepository alarmActivityRepository) {
        this.alarmRepository = alarmRepository;
        this.alarmActivityRepository = alarmActivityRepository;
    }

    @Transactional
    public Alarm ack(String alarmId, User user, String note) {
        Alarm alarm = alarmRepository.findByIdWithLabels(alarmId);
        if (alarm == null) return null;

        if (!canAck(user, alarm)) {
            throw new PermissionDeniedException("User " + user.getName() + " (" + user.getDepartment()
                    + ") cannot ack alarm in " + alarm.getDepartment());
        }

        alarm.setStatus(AlarmStatus.Acked);
        alarmRepository.save(alarm);

        AlarmActivity activity = new AlarmActivity();
        activity.setAlarmId(alarmId);
        activity.setType(AlarmActivityType.acked);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        activity.setNote(note);
        alarmActivityRepository.save(activity);

        return alarm;
    }

    @Transactional
    public Alarm setLabel(String alarmId, User user, String action, AlarmLabel label) {
        Alarm alarm = alarmRepository.findByIdWithLabels(alarmId);
        if (alarm == null) return null;

        if ("add".equals(action)) {
            alarm.getLabels().add(label);
        } else {
            alarm.getLabels().remove(label);
        }
        alarmRepository.save(alarm);

        AlarmActivity activity = new AlarmActivity();
        activity.setAlarmId(alarmId);
        activity.setType("add".equals(action) ? AlarmActivityType.label_added : AlarmActivityType.label_removed);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        activity.setLabel(label);
        alarmActivityRepository.save(activity);

        return alarm;
    }

    @Transactional
    public Alarm setRisk(String alarmId, User user, HumanRisk risk) {
        Alarm alarm = alarmRepository.findByIdWithLabels(alarmId);
        if (alarm == null) return null;

        HumanRisk fromRisk = alarm.getHumanRisk();
        alarm.setHumanRisk(risk);
        alarmRepository.save(alarm);

        AlarmActivity activity = new AlarmActivity();
        activity.setAlarmId(alarmId);
        activity.setType(AlarmActivityType.risk_changed);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        activity.setFromRisk(fromRisk);
        activity.setToRisk(risk);
        alarmActivityRepository.save(activity);

        return alarm;
    }

    @Transactional
    public Alarm recover(String alarmId, User user) {
        Alarm alarm = alarmRepository.findByIdWithLabels(alarmId);
        if (alarm == null) return null;

        if (alarm.getRecoveryTime() != null) {
            throw new IllegalStateException("Alarm " + alarmId + " already has a recoveryTime");
        }

        alarm.setRecoveryTime(Instant.now());
        alarmRepository.save(alarm);

        AlarmActivity activity = new AlarmActivity();
        activity.setAlarmId(alarmId);
        activity.setType(AlarmActivityType.recovered);
        activity.setTimestamp(Instant.now());
        activity.setAuthor(user.getName());
        alarmActivityRepository.save(activity);

        return alarm;
    }

    public List<AlarmActivity> getActivity(String alarmId) {
        return alarmActivityRepository.findByAlarmIdOrderByTimestampAsc(alarmId);
    }

    public boolean canAck(User user, Alarm alarm) {
        return user.getDepartment() != null
                && !user.getDepartment().isEmpty()
                && user.getDepartment().equals(alarm.getDepartment());
    }

    public List<Alarm> findByDateRange(Instant from, Instant to,
                                        String search,
                                        List<AlarmStatus> status,
                                        List<String> department,
                                        List<RiskLevel> severity,
                                        List<HumanRisk> humanRisk,
                                        List<AlarmType> alarmType,
                                        List<String> owner,
                                        List<String> machineId,
                                        List<String> chamberId,
                                        List<String> product,
                                        List<String> operation,
                                        List<AlarmLabel> labels,
                                        String active) {
        List<Alarm> alarms = alarmRepository.findByTimeRange(from, to);
        return alarms.stream()
                .filter(a -> matchSearch(a, search))
                .filter(a -> matchList(a.getStatus(), status))
                .filter(a -> matchStringList(a.getDepartment(), department))
                .filter(a -> matchList(a.getSeverity(), severity))
                .filter(a -> matchNullableList(a.getHumanRisk(), humanRisk))
                .filter(a -> matchList(a.getType(), alarmType))
                .filter(a -> matchStringList(a.getOwner(), owner))
                .filter(a -> matchStringList(a.getMachineId(), machineId))
                .filter(a -> matchNullableStringList(a.getChamberId(), chamberId))
                .filter(a -> matchStringList(a.getProduct(), product))
                .filter(a -> matchStringList(a.getOperation(), operation))
                .filter(a -> matchLabels(a.getLabels(), labels))
                .filter(a -> matchActive(a, active))
                .collect(Collectors.toList());
    }

    public Optional<Alarm> findById(String id) {
        Alarm alarm = alarmRepository.findByIdWithLabels(id);
        return Optional.ofNullable(alarm);
    }

    private boolean matchSearch(Alarm a, String search) {
        if (search == null || search.isBlank()) return true;
        String q = search.toLowerCase();
        String haystack = (a.getId() + " " + a.getMessage() + " " + a.getType() + " " + a.getMachineId() + " " + a.getOwner()).toLowerCase();
        return haystack.contains(q);
    }

    private <T> boolean matchList(T value, List<T> filter) {
        if (filter == null || filter.isEmpty()) return true;
        return filter.contains(value);
    }

    private boolean matchStringList(String value, List<String> filter) {
        if (filter == null || filter.isEmpty()) return true;
        return filter.contains(value);
    }

    private <T> boolean matchNullableList(T value, List<T> filter) {
        if (filter == null || filter.isEmpty()) return true;
        if (value == null) return false;
        return filter.contains(value);
    }

    private boolean matchNullableStringList(String value, List<String> filter) {
        if (filter == null || filter.isEmpty()) return true;
        if (value == null) return false;
        return filter.contains(value);
    }

    private boolean matchLabels(Set<AlarmLabel> alarmLabels, List<AlarmLabel> filter) {
        if (filter == null || filter.isEmpty()) return true;
        return filter.stream().anyMatch(alarmLabels::contains);
    }

    private boolean matchActive(Alarm a, String active) {
        if (active == null || active.isBlank()) return true;
        boolean isActive = a.getRecoveryTime() == null || a.getRecoveryTime().isAfter(Instant.now());
        if ("active".equals(active)) return isActive;
        if ("recovered".equals(active)) return !isActive;
        return true;
    }
}
