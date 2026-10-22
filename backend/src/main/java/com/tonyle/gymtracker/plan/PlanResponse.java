package com.tonyle.gymtracker.plan;
import java.util.List;
// Build the response inside the transaction, while lazy exercise collections are available.
public record PlanResponse(Long id, String name, String description, List<ExerciseResponse> exercises) {
    public static PlanResponse from(WorkoutPlan plan) {
        return new PlanResponse(plan.getId(), plan.getName(), plan.getDescription(), plan.getExercises().stream()
            .map(e -> new ExerciseResponse(e.getName(), e.getTargetSets(), e.getTargetReps())).toList());
    }
    public record ExerciseResponse(String name, int targetSets, int targetReps) {}
}
