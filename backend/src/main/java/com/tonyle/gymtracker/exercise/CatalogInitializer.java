package com.tonyle.gymtracker.exercise;

import com.tonyle.gymtracker.plan.PlanRepository;
import com.tonyle.gymtracker.workout.WorkoutRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CatalogInitializer implements ApplicationRunner {
    private final ExerciseCatalog catalog;
    private final PlanRepository plans;
    private final WorkoutRepository workouts;
    public CatalogInitializer(ExerciseCatalog catalog, PlanRepository plans, WorkoutRepository workouts) {
        this.catalog = catalog; this.plans = plans; this.workouts = workouts;
    }
    @Override @Transactional
    public void run(ApplicationArguments arguments) {
        for (String name : new String[] { "Bench press", "Dumbbell press", "Incline dumbbell press", "Squat", "Deadlift", "Barbell row", "Lat pulldown", "Pull-up", "Shoulder press", "Biceps curl", "Triceps pushdown", "Leg press" }) catalog.resolve(null, name);
        // Add identities without renaming or deleting existing records. Safe to run again.
        plans.findAll().forEach(plan -> plan.getExercises().forEach(exercise -> {
            if (exercise.getExerciseId() == null) exercise.linkExercise(catalog.resolve(null, exercise.getName()).getId());
        }));
        workouts.findAll().forEach(workout -> workout.getSets().forEach(set -> {
            if (set.getExerciseId() == null) set.linkExercise(catalog.resolve(null, set.getExerciseName()).getId());
        }));
    }
}
