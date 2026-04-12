package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "alarm")
public class Alarm {

    @Id
    @Column(length = 20)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlarmType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RiskLevel severity;

    @Column(nullable = false, length = 200)
    private String message;

    @Column(name = "alarm_value")
    private Double value;

    @Column(length = 10)
    private String unit;

    @Column(name = "alarm_time", nullable = false)
    private Instant time;

    private Instant recoveryTime;

    @Column(nullable = false, length = 20)
    private String machineId;

    @Column(length = 5)
    private String chamberId;

    @Column(nullable = false, length = 20)
    private String product;

    @Column(nullable = false, length = 40)
    private String operation;

    @Column(nullable = false, length = 100)
    private String owner;

    @Column(nullable = false, length = 50)
    private String department;

    @Column(length = 50)
    private String chartOwnerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private AlarmStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private HumanRisk humanRisk;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "alarm_label", joinColumns = @JoinColumn(name = "alarm_id"))
    @Column(name = "label")
    @Enumerated(EnumType.STRING)
    private Set<AlarmLabel> labels = new HashSet<>();

    public Alarm() {}

    // Getters and setters

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public AlarmType getType() { return type; }
    public void setType(AlarmType type) { this.type = type; }

    public RiskLevel getSeverity() { return severity; }
    public void setSeverity(RiskLevel severity) { this.severity = severity; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Instant getTime() { return time; }
    public void setTime(Instant time) { this.time = time; }

    public Instant getRecoveryTime() { return recoveryTime; }
    public void setRecoveryTime(Instant recoveryTime) { this.recoveryTime = recoveryTime; }

    public String getMachineId() { return machineId; }
    public void setMachineId(String machineId) { this.machineId = machineId; }

    public String getChamberId() { return chamberId; }
    public void setChamberId(String chamberId) { this.chamberId = chamberId; }

    public String getProduct() { return product; }
    public void setProduct(String product) { this.product = product; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getChartOwnerId() { return chartOwnerId; }
    public void setChartOwnerId(String chartOwnerId) { this.chartOwnerId = chartOwnerId; }

    public AlarmStatus getStatus() { return status; }
    public void setStatus(AlarmStatus status) { this.status = status; }

    public HumanRisk getHumanRisk() { return humanRisk; }
    public void setHumanRisk(HumanRisk humanRisk) { this.humanRisk = humanRisk; }

    public Set<AlarmLabel> getLabels() { return labels; }
    public void setLabels(Set<AlarmLabel> labels) { this.labels = labels; }
}
