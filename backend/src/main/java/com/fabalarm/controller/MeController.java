package com.fabalarm.controller;

import com.fabalarm.auth.CurrentUserHolder;
import com.fabalarm.model.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Auth", description = "Authentication endpoints")
public class MeController {

    @Operation(summary = "Current user", description = "Returns the authenticated user from X-User-Id header")
    @GetMapping("/me")
    public ResponseEntity<Map<String, String>> me() {
        User user = CurrentUserHolder.get();
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "department", user.getDepartment()));
    }
}
