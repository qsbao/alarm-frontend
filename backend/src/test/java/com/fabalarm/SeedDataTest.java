package com.fabalarm;

import com.fabalarm.repository.AlarmRepository;
import com.fabalarm.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class SeedDataTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    @Test
    void seedDataLoads27Users() {
        assertEquals(27, userRepository.count());
    }

    @Test
    void seedDataContainsExpectedUser() {
        assertTrue(userRepository.findById("user-tanaka").isPresent());
        assertEquals("H. Tanaka", userRepository.findById("user-tanaka").get().getName());
        assertEquals("Litho", userRepository.findById("user-tanaka").get().getDepartment());
    }

    @Test
    void seedDataLoads150Alarms() {
        assertEquals(150, alarmRepository.count());
    }

    @Test
    void seedDataContainsExpectedAlarm() {
        var alarm = alarmRepository.findByIdWithLabels("alm-001");
        assertNotNull(alarm);
        assertEquals("example-plugin:TempSpike", alarm.getType());
        assertEquals("Litho", alarm.getDepartment());
    }

    @Test
    void seedDataLoadsAlarmLabels() {
        // At least some alarms should have labels
        long alarmsWithLabels = alarmRepository.findAll().stream()
                .filter(a -> !a.getLabels().isEmpty())
                .count();
        assertTrue(alarmsWithLabels > 0, "Some alarms should have labels");
    }
}
