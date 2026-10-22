package com.tonyle.gymtracker.workout;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {
    // A client-generated ID makes retrying the same completed session safe.
    @Id private UUID id;
    private Long planId;
    @Column(nullable = false, length = 100)
    private String planName;
    @Column(nullable = false)
    private Instant startedAt;
    @Column(nullable = false)
    private Instant completedAt;
    @ElementCollection
    @CollectionTable(name = "workout_sets", joinColumns = @JoinColumn(name = "session_id"))
    @OrderColumn(name = "set_order")
    private List<LoggedSet> sets = new ArrayList<>();

    protected WorkoutSession() {}
    public WorkoutSession(WorkoutRequest request) {
        id = request.id(); planId = request.planId(); planName = request.planName().trim();
        startedAt = request.startedAt(); completedAt = Instant.now();
        for (int i = 0; i < request.exercises().size(); i++) {
            var exercise = request.exercises().get(i);
            for (int j = 0; j < exercise.sets().size(); j++) {
                sets.add(new LoggedSet(exercise.name(), i + 1, j + 1, exercise.targetReps(), exercise.sets().get(j)));
            }
        }
    }
    public UUID getId() { return id; }
    public Long getPlanId() { return planId; }
    public String getPlanName() { return planName; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public List<LoggedSet> getSets() { return sets; }
}
