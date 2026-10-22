package com.tonyle.gymtracker.workout;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Embeddable
public class LoggedSet {
    @Column(nullable = false, length = 100)
    private String exerciseName;
    @Column(nullable = false)
    private int exerciseNumber;
    @Column(nullable = false)
    private int setNumber;
    @Column(nullable = false)
    private int targetReps;
    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal weight;
    @Column(nullable = false)
    private int reps;
    private Long exerciseId;

    protected LoggedSet() {}
    public LoggedSet(WorkoutRequest.ExerciseRequest exercise, int exerciseNumber, int setNumber, WorkoutRequest.SetRequest set) {
        this.exerciseName = exercise.name().trim(); this.exerciseNumber = exerciseNumber;
        this.setNumber = setNumber; this.targetReps = exercise.targetReps(); this.exerciseId = exercise.exerciseId();
        this.weight = set.weight(); this.reps = set.reps().intValueExact();
    }
    public Long getExerciseId() { return exerciseId; }
    public void linkExercise(Long id) { exerciseId = id; }
    public String getExerciseName() { return exerciseName; }
    public int getExerciseNumber() { return exerciseNumber; }
    public int getSetNumber() { return setNumber; }
    public int getTargetReps() { return targetReps; }
    public BigDecimal getWeight() { return weight; }
    public int getReps() { return reps; }
}
