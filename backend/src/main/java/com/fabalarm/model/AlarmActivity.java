package com.fabalarm.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "alarm_activity")
public class AlarmActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alarm_id", nullable = false, length = 20)
    private String alarmId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AlarmActivityType type;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(nullable = false, length = 100)
    private String author;

    @Column(length = 500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AlarmLabel label;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private HumanRisk fromRisk;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private HumanRisk toRisk;

    public AlarmActivity() {}

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAlarmId() { return alarmId; }
    public void setAlarmId(String alarmId) { this.alarmId = alarmId; }

    public AlarmActivityType getType() { return type; }
    public void setType(AlarmActivityType type) { this.type = type; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public AlarmLabel getLabel() { return label; }
    public void setLabel(AlarmLabel label) { this.label = label; }

    public HumanRisk getFromRisk() { return fromRisk; }
    public void setFromRisk(HumanRisk fromRisk) { this.fromRisk = fromRisk; }

    public HumanRisk getToRisk() { return toRisk; }
    public void setToRisk(HumanRisk toRisk) { this.toRisk = toRisk; }
}
