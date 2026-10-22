package com.tonyle.gymtracker.exercise;

import jakarta.persistence.*;
@Entity
@Table(name = "exercises")
public class Exercise {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, unique = true, length = 100)
    private String normalizedName;
    protected Exercise() {}
    public Exercise(String name, String normalizedName) { this.name = name; this.normalizedName = normalizedName; }
    public Long getId() { return id; }
    public String getName() { return name; }
}
