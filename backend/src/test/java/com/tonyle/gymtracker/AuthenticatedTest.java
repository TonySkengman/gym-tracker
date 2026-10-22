package com.tonyle.gymtracker;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;

abstract class AuthenticatedTest {
    @BeforeEach void signInTestUser() {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated("1", null, List.of()));
    }
    @AfterEach void clearTestUser() { SecurityContextHolder.clearContext(); }
}
