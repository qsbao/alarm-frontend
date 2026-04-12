package com.fabalarm;

import com.fabalarm.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class SeedDataTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void seedDataLoads18Users() {
        assertEquals(18, userRepository.count());
    }

    @Test
    void seedDataContainsExpectedUser() {
        assertTrue(userRepository.findById("user-tanaka").isPresent());
        assertEquals("H. Tanaka", userRepository.findById("user-tanaka").get().getName());
        assertEquals("Litho", userRepository.findById("user-tanaka").get().getDepartment());
    }
}
