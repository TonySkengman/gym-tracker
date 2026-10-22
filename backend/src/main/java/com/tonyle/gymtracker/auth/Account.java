package com.tonyle.gymtracker.auth;

import jakarta.persistence.*;

@Entity
@Table(name = "user_accounts")
public class Account {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 254) private String email;
    @Column(nullable = false, length = 60) private String displayName;
    @Column(nullable = false) private String passwordHash;
    protected Account() {}
    public Account(String email, String displayName, String passwordHash) {
        this.email = email; this.displayName = displayName; this.passwordHash = passwordHash;
    }
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
}
