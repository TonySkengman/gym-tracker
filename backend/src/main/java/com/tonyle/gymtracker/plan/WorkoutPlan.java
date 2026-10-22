package com.tonyle.gymtracker.plan;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
@Entity
@Table(name = "workout_plans")
public class WorkoutPlan {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, length = 500)
    private String description;
    @ElementCollection
    @CollectionTable(name = "plan_exercises", joinColumns = @JoinColumn(name = "plan_id"))
    @OrderColumn(name = "exercise_order")
    private List<PlanExercise> exercises = new ArrayList<>();
    protected WorkoutPlan() {}
    public WorkoutPlan(PlanRequest request) { update(request); }
    public void update(PlanRequest request) {
        name = request.name().trim();
        description = request.description() == null ? "" : request.description().trim();
        exercises.clear();
        request.exercises().forEach(e -> exercises.add(new PlanExercise(e.name().trim(), e.targetSets(), e.targetReps())));
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public List<PlanExercise> getExercises() { return exercises; }
}
