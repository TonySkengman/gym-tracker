package com.tonyle.gymtracker.workout;
import jakarta.persistence.*;

@Embeddable
public class SkippedExercise {
    private Long exerciseId;
    @Column(nullable = false, length = 100)
    private String exerciseName;
    private int exerciseNumber;
    private int targetReps;
    protected SkippedExercise() {}
    public SkippedExercise(WorkoutRequest.ExerciseRequest exercise, int number) {
        exerciseId = exercise.exerciseId(); exerciseName = exercise.name();
        exerciseNumber = number; targetReps = exercise.targetReps();
    }
    public void linkExercise(Long id) { exerciseId = id; }
    public Long getExerciseId() { return exerciseId; }
    public String getExerciseName() { return exerciseName; }
    public int getExerciseNumber() { return exerciseNumber; }
    public int getTargetReps() { return targetReps; }
}
