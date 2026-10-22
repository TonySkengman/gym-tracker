package com.tonyle.gymtracker.auth;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AccountRepository accounts;
    private final PasswordEncoder passwords;
    private final SecurityContextRepository contexts;
    private final String dummyHash;
    public AuthController(AccountRepository accounts, PasswordEncoder passwords, SecurityContextRepository contexts) {
        this.accounts = accounts; this.passwords = passwords; this.contexts = contexts;
        dummyHash = passwords.encode("unused-password-for-timing");
    }
    public record Registration(@NotBlank @Size(max = 60) String displayName,
        @NotBlank @Email @Size(max = 254) String email, @NotNull @Size(min = 8, max = 72) String password) {
        @AssertTrue(message = "Password must fit within 72 UTF-8 bytes")
        public boolean isPasswordLengthValid() { return password == null || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72; }
    }
    public record Login(@NotBlank @Email @Size(max = 254) String email, @NotNull @Size(max = 72) String password) {
        @AssertTrue(message = "Password must fit within 72 UTF-8 bytes")
        public boolean isPasswordLengthValid() { return password == null || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72; }
    }
    public record User(Long id, String displayName, String email) {
        static User from(Account account) { return new User(account.getId(), account.getDisplayName(), account.getEmail()); }
    }
    public record Csrf(String token, String headerName) {}
    @GetMapping("/csrf") public Csrf csrf(CsrfToken token) { return new Csrf(token.getToken(), token.getHeaderName()); }
    @GetMapping("/me") public User me() { return User.from(accounts.findById(CurrentUser.id()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in"))); }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public User register(@Valid @RequestBody Registration input, HttpServletRequest request, HttpServletResponse response) {
        String email = normalize(input.email());
        if (accounts.findByEmail(email).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        Account account;
        try { account = accounts.saveAndFlush(new Account(email, input.displayName().trim(), passwords.encode(input.password()))); }
        catch (org.springframework.dao.DataIntegrityViolationException exception) { throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists"); }
        return signIn(account, request, response);
    }
    @PostMapping("/login") public User login(@Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
        var account = accounts.findByEmail(normalize(input.email()));
        boolean matches = passwords.matches(input.password(), account.map(Account::getPasswordHash).orElse(dummyHash));
        if (account.isEmpty() || !matches) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        return signIn(account.get(), request, response);
    }
    private User signIn(Account account, HttpServletRequest request, HttpServletResponse response) {
        // Rotate both the session ID and CSRF token when authentication changes.
        request.getSession(); request.changeSessionId();
        var authentication = UsernamePasswordAuthenticationToken.authenticated(account.getId().toString(), null, List.of());
        var context = SecurityContextHolder.createEmptyContext(); context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context); contexts.saveContext(context, request, response);
        new HttpSessionCsrfTokenRepository().saveToken(null, request, response);
        return User.from(account);
    }
    private String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
}
