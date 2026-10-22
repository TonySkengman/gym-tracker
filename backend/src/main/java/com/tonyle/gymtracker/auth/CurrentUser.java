package com.tonyle.gymtracker.auth;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

public final class CurrentUser {
    private CurrentUser() {}
    public static Long id() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in");
        return Long.valueOf(auth.getName());
    }
    public static void requireOwner(Long ownerId) {
        if (!id().equals(ownerId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found");
    }
}
