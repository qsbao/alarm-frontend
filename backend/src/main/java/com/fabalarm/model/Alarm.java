package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
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
    private Instant alarmTime;

    private Instant eventTime;

    private LocalDate alarmDate;

    private Instant recoveryTime;

    @Column(nullable = false, length = 20)
    private String eqpId;

    @Column(length = 5)
    private String chamberId;

    @Column(nullable = false, length = 20)
    private String productId;

    @Column(length = 40)
    private String operName;

    @Column(length = 20)
    private String operNo;

    @Column(length = 20)
    private String technologyId;

    @Column(length = 20)
    private String productGroupId;

    @Column(length = 40)
    private String processOperName;

    @Column(length = 20)
    private String processOperNo;

    @Column(length = 20)
    private String lotId;

    private Integer lotPriority;

    @Column(length = 20)
    private String waferId;

    @Column(length = 20)
    private String recipeId;

    @Column(length = 20)
    private String routeId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Module module;

    @Column(length = 100)
    private String moduleOwner;

    @Column(length = 100)
    private String piOwner;

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
    private RiskLevel riskLevel;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "alarm_label", joinColumns = @JoinColumn(name = "alarm_id"))
    @Column(name = "label")
    @Enumerated(EnumType.STRING)
    private Set<AlarmLabel> labels = new HashSet<>();

    public Alarm() {}

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

    public Instant getAlarmTime() { return alarmTime; }
    public void setAlarmTime(Instant alarmTime) { this.alarmTime = alarmTime; }

    public Instant getEventTime() { return eventTime; }
    public void setEventTime(Instant eventTime) { this.eventTime = eventTime; }

    public LocalDate getAlarmDate() { return alarmDate; }
    public void setAlarmDate(LocalDate alarmDate) { this.alarmDate = alarmDate; }

    public Instant getRecoveryTime() { return recoveryTime; }
    public void setRecoveryTime(Instant recoveryTime) { this.recoveryTime = recoveryTime; }

    public String getEqpId() { return eqpId; }
    public void setEqpId(String eqpId) { this.eqpId = eqpId; }

    public String getChamberId() { return chamberId; }
    public void setChamberId(String chamberId) { this.chamberId = chamberId; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getOperName() { return operName; }
    public void setOperName(String operName) { this.operName = operName; }

    public String getOperNo() { return operNo; }
    public void setOperNo(String operNo) { this.operNo = operNo; }

    public String getTechnologyId() { return technologyId; }
    public void setTechnologyId(String technologyId) { this.technologyId = technologyId; }

    public String getProductGroupId() { return productGroupId; }
    public void setProductGroupId(String productGroupId) { this.productGroupId = productGroupId; }

    public String getProcessOperName() { return processOperName; }
    public void setProcessOperName(String processOperName) { this.processOperName = processOperName; }

    public String getProcessOperNo() { return processOperNo; }
    public void setProcessOperNo(String processOperNo) { this.processOperNo = processOperNo; }

    public String getLotId() { return lotId; }
    public void setLotId(String lotId) { this.lotId = lotId; }

    public Integer getLotPriority() { return lotPriority; }
    public void setLotPriority(Integer lotPriority) { this.lotPriority = lotPriority; }

    public String getWaferId() { return waferId; }
    public void setWaferId(String waferId) { this.waferId = waferId; }

    public String getRecipeId() { return recipeId; }
    public void setRecipeId(String recipeId) { this.recipeId = recipeId; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public Module getModule() { return module; }
    public void setModule(Module module) { this.module = module; }

    public String getModuleOwner() { return moduleOwner; }
    public void setModuleOwner(String moduleOwner) { this.moduleOwner = moduleOwner; }

    public String getPiOwner() { return piOwner; }
    public void setPiOwner(String piOwner) { this.piOwner = piOwner; }

    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getChartOwnerId() { return chartOwnerId; }
    public void setChartOwnerId(String chartOwnerId) { this.chartOwnerId = chartOwnerId; }

    public AlarmStatus getStatus() { return status; }
    public void setStatus(AlarmStatus status) { this.status = status; }

    public RiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(RiskLevel riskLevel) { this.riskLevel = riskLevel; }

    public Set<AlarmLabel> getLabels() { return labels; }
    public void setLabels(Set<AlarmLabel> labels) { this.labels = labels; }
}
