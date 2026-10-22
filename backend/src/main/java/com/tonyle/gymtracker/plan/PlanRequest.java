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
                                  @NotNull @Min(1) @Max(100) Integer targetReps) {}
}
