package com.tonyle.gymtracker.plan;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public record PlanRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 500) String description,
    @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid ExerciseRequest> exercises
) {
    public record ExerciseRequest(@NotBlank @Size(max = 100) String name,
                                  @NotNull @Min(1) @Max(50) Integer targetSets,
                                  @NotNull @Min(1) @Max(100) Integer targetReps, @Positive Long exerciseId, @Min(0) @Max(3600) Integer restSeconds) {
        public ExerciseRequest(String name, Integer targetSets, Integer targetReps, Long exerciseId) { this(name, targetSets, targetReps, exerciseId, null); }
        public ExerciseRequest(String name, Integer targetSets, Integer targetReps) { this(name, targetSets, targetReps, null, null); }
    }
}
