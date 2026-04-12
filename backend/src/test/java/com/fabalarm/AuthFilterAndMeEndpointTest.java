package com.fabalarm;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthFilterAndMeEndpointTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void meEndpointReturnsCurrentUser() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", "user-tanaka");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/me", HttpMethod.GET, entity, String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("user-tanaka"));
        assertTrue(response.getBody().contains("H. Tanaka"));
        assertTrue(response.getBody().contains("Litho"));
    }

    @Test
    void missingUserIdHeaderReturns401() {
        ResponseEntity<String> response = restTemplate.getForEntity("/api/me", String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void invalidUserIdReturns401() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", "user-nonexistent");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<String> response = restTemplate.exchange(
                "/api/me", HttpMethod.GET, entity, String.class);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void healthEndpointSkipsAuthFilter() {
        // Health endpoint should work without X-User-Id
        ResponseEntity<String> response = restTemplate.getForEntity("/api/health", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void openApiSpecSkipsAuthFilter() {
        ResponseEntity<String> response = restTemplate.getForEntity("/v3/api-docs", String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
