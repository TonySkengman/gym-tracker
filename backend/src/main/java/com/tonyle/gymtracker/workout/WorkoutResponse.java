package com.tonyle.gymtracker.workout;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkoutResponse(UUID id, Long planId, String planName, Instant startedAt, Instant completedAt, List<SetResponse> sets) {
    public static WorkoutResponse from(WorkoutSession session) {
        return new WorkoutResponse(session.getId(), session.getPlanId(), session.getPlanName(), session.getStartedAt(), session.getCompletedAt(),
            session.getSets().stream().map(set -> new SetResponse(set.getExerciseName(), set.getExerciseNumber(), set.getSetNumber(), set.getTargetReps(), set.getWeight(), set.getReps())).toList());
    }
    public record SetResponse(String exerciseName, int exerciseNumber, int setNumber, int targetReps, BigDecimal weight, int reps) {}
}
