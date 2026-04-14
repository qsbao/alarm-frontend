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
    private final IngestProjector ingestProjector;

    public AlarmService(AlarmRepository alarmRepository, AlarmActivityRepository alarmActivityRepository, IngestProjector ingestProjector) {
        this.alarmRepository = alarmRepository;
        this.alarmActivityRepository = alarmActivityRepository;
        this.ingestProjector = ingestProjector;
    }

    @Transactional
    public Alarm create(Alarm alarm) {
        if (alarm.getId() != null && alarmRepository.findByIdWithLabels(alarm.getId()) != null) {
            throw new AlarmAlreadyExistsException("Alarm already exists: " + alarm.getId());
        }
        // Project value/unit from details - this overrides any caller-provided value/unit
        ingestProjector.projectValueAndUnit(alarm);
        return alarmRepository.save(alarm);
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
    public Alarm setRisk(String alarmId, User user, HumanRiskLevel risk) {
        Alarm alarm = alarmRepository.findByIdWithLabels(alarmId);
        if (alarm == null) return null;

        HumanRiskLevel fromRisk = alarm.getRiskLevel();
        alarm.setRiskLevel(risk);
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
                                        List<HumanRiskLevel> riskLevel,
                                        List<String> alarmType,
                                        List<String> owner,
                                        List<String> eqpId,
                                        List<String> chamberId,
                                        List<String> productId,
                                        List<String> operName,
                                        List<AlarmLabel> labels,
                                        String active) {
        List<Alarm> alarms = alarmRepository.findByTimeRange(from, to);
        return alarms.stream()
                .filter(a -> matchSearch(a, search))
                .filter(a -> matchList(a.getStatus(), status))
                .filter(a -> matchStringList(a.getDepartment(), department))
                .filter(a -> matchList(a.getSeverity(), severity))
                .filter(a -> matchNullableList(a.getRiskLevel(), riskLevel))
                .filter(a -> matchStringList(a.getType(), alarmType))
                .filter(a -> matchStringList(a.getOwner(), owner))
                .filter(a -> matchStringList(a.getEqpId(), eqpId))
                .filter(a -> matchNullableStringList(a.getChamberId(), chamberId))
                .filter(a -> matchStringList(a.getProductId(), productId))
                .filter(a -> matchStringList(a.getOperName(), operName))
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
        String haystack = (a.getId() + " " + a.getMessage() + " " + a.getType() + " " + a.getEqpId() + " " + a.getOwner()).toLowerCase();
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
        if ("active".equals(active)) {
            return a.getRecoveryTime() == null;
        } else if ("recovered".equals(active)) {
            return a.getRecoveryTime() != null;
        }
        return true;
    }
}
