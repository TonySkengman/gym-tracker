package com.tonyle.gymtracker.schedule;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "scheduled_workouts", uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "workout_date"}))
public class ScheduledWorkout {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    // Keep the schedule entry visible if its source plan is deleted.
    @Column(name = "plan_id", nullable = false)
    private Long planId;
    @Column(nullable = false, length = 100)
    private String planName;
    @Column(name = "workout_date", nullable = false)
    private LocalDate date;
    private UUID completedWorkoutId;
    // Nullable only for data created before accounts were introduced.
    private Long ownerId;
    public Long getOwnerId() { return ownerId; }
    public void assignOwner(Long ownerId) { this.ownerId = ownerId; }
    protected ScheduledWorkout() {}
    public ScheduledWorkout(Long planId, String planName, LocalDate date) { update(planId, planName, date); }
    public void update(Long planId, String planName, LocalDate date) { this.planId = planId; this.planName = planName; this.date = date; }
    public void complete(UUID workoutId) { completedWorkoutId = workoutId; }
    public void reopen() { completedWorkoutId = null; }
    public Long getId() { return id; }
    public Long getPlanId() { return planId; }
    public String getPlanName() { return planName; }
    public LocalDate getDate() { return date; }
    public UUID getCompletedWorkoutId() { return completedWorkoutId; }
}
