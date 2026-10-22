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
    @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid ExerciseRequest> exercises,
    @Positive Long scheduleId
) {
    public WorkoutRequest(UUID id, Long planId, String planName, Instant startedAt, List<ExerciseRequest> exercises) {
        this(id, planId, planName, startedAt, exercises, null);
    }
    @AssertTrue(message = "Record at least one set before saving a workout")
    public boolean isRecordedSetPresent() {
        return exercises == null || exercises.stream().anyMatch(exercise -> exercise != null && !exercise.skipped() && exercise.sets() != null && !exercise.sets().isEmpty());
    }
    public record ExerciseRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull @Min(1) @Max(100) Integer targetReps,
        @NotNull @Size(max = 50) List<@NotNull @Valid SetRequest> sets,
        @Positive Long exerciseId,
        Boolean skipped
    ) {
        public ExerciseRequest { skipped = Boolean.TRUE.equals(skipped); }
        public ExerciseRequest(String name, Integer targetReps, List<SetRequest> sets) { this(name, targetReps, sets, null, false); }
        @AssertTrue(message = "A skipped exercise must have no sets; a performed exercise requires at least one set")
        public boolean isSetSelectionValid() { return sets == null || (skipped ? sets.isEmpty() : !sets.isEmpty()); }
    }
    public record SetRequest(
        @NotNull @DecimalMin("0") @DecimalMax("2000") @Digits(integer = 4, fraction = 2) BigDecimal weight,
        @NotNull @DecimalMin("1") @DecimalMax("100") @Digits(integer = 3, fraction = 0) BigDecimal reps
    ) {}
}
