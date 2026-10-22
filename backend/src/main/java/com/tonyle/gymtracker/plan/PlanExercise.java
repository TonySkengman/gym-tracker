package com.tonyle.gymtracker.plan;
import jakarta.persistence.*;
@Embeddable
public class PlanExercise {
    @Column(nullable = false, length = 100)
    private String name;
    private Long exerciseId;
    @Column(nullable = false)
    private int targetSets;
    @Column(nullable = false)
    private int targetReps;
    private Integer restSeconds;
    public Integer getRestSeconds() { return restSeconds; }
    public PlanExercise(String name, int targetSets, int targetReps, Long exerciseId, Integer restSeconds) { this(name, targetSets, targetReps, exerciseId); this.restSeconds = restSeconds; }
    protected PlanExercise() {}
    public PlanExercise(String name, int targetSets, int targetReps) { this.name = name; this.targetSets = targetSets; this.targetReps = targetReps; }
    public PlanExercise(String name, int targetSets, int targetReps, Long exerciseId) { this(name, targetSets, targetReps); this.exerciseId = exerciseId; }
    public Long getExerciseId() { return exerciseId; }
    public void linkExercise(Long id) { exerciseId = id; }
    public String getName() { return name; }
    public int getTargetSets() { return targetSets; }
    public int getTargetReps() { return targetReps; }
}
