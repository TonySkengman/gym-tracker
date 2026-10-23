package com.tonyle.gymtracker.exercise;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
@Entity
@Table(name = "exercises")
public class Exercise {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, unique = true, length = 100)
    private String normalizedName;
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "exercise_primary_muscles", joinColumns = @JoinColumn(name = "exercise_id"))
    @OrderColumn(name = "muscle_order")
    @Column(name = "muscle", length = 40)
    private List<String> primaryMuscles = new ArrayList<>();
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "exercise_secondary_muscles", joinColumns = @JoinColumn(name = "exercise_id"))
    @OrderColumn(name = "muscle_order")
    @Column(name = "muscle", length = 40)
    private List<String> secondaryMuscles = new ArrayList<>();
    public List<String> getPrimaryMuscles() { return primaryMuscles; }
    public List<String> getSecondaryMuscles() { return secondaryMuscles; }
    public void setMuscles(List<String> primary, List<String> secondary) {
        primaryMuscles.clear(); secondaryMuscles.clear();
        if (primary != null) primary.stream().map(ExerciseCatalog::cleanName).distinct().forEach(primaryMuscles::add);
        if (secondary != null) secondary.stream().map(ExerciseCatalog::cleanName).distinct()
            .filter(name -> primaryMuscles.stream().noneMatch(name::equalsIgnoreCase)).forEach(secondaryMuscles::add);
    }
    protected Exercise() {}
    public Exercise(String name, String normalizedName) { this.name = name; this.normalizedName = normalizedName; }
    public Long getId() { return id; }
    public String getName() { return name; }
}
