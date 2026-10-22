package com.tonyle.gymtracker.workout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkoutRequest(
    @NotNull UUID id,
    @NotNull @Positive Long planId,
    @NotBlank @Size(max = 100) String planName,
    @NotNull @PastOrPresent Instant startedAt,
    @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid ExerciseRequest> exercises
) {
    public record ExerciseRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull @Min(1) @Max(100) Integer targetReps,
        @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid SetRequest> sets
    ) {}
    public record SetRequest(
        @NotNull @DecimalMin("0") @DecimalMax("2000") @Digits(integer = 4, fraction = 2) BigDecimal weight,
        @NotNull @DecimalMin("1") @DecimalMax("100") @Digits(integer = 3, fraction = 0) BigDecimal reps
    ) {}
}
