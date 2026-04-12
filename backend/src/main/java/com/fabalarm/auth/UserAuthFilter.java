package com.fabalarm.auth;

import com.fabalarm.repository.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;

@Component
@Order(1)
public class UserAuthFilter implements Filter {

    private static final Set<String> PUBLIC_PREFIXES = Set.of(
            "/api/health", "/v3/api-docs", "/h2-console", "/swagger-ui");

    private final UserRepository userRepository;

    public UserAuthFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        String path = request.getRequestURI();
        if (isPublic(path)) {
            chain.doFilter(req, res);
            return;
        }

        String userId = request.getHeader("X-User-Id");
        if (userId == null || userId.isBlank()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing X-User-Id header");
            return;
        }

        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unknown user: " + userId);
            return;
        }

        CurrentUserHolder.set(userOpt.get());
        try {
            chain.doFilter(req, res);
        } finally {
            CurrentUserHolder.clear();
        }
    }

    private boolean isPublic(String path) {
        for (String prefix : PUBLIC_PREFIXES) {
            if (path.startsWith(prefix)) return true;
        }
        return false;
    }
}
