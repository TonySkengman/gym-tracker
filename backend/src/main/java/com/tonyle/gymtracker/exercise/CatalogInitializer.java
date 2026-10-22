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
        // Common gym movements; retain existing names and IDs when seeding again.
        for (String name : new String[] {
            "Bench press", "Dumbbell press", "Incline dumbbell press", "Squat",
            "Deadlift", "Barbell row", "Lat pulldown", "Pull-up",
            "Shoulder press", "Biceps curl", "Triceps pushdown", "Leg press",
            "Incline bench press", "Chest press machine", "Cable fly", "Pec deck",
            "Push-up", "Chest dip", "Seated cable row", "Dumbbell row",
            "Chest-supported row", "Chin-up", "Straight-arm pulldown", "Face pull",
            "Back extension", "Dumbbell shoulder press", "Lateral raise", "Reverse pec deck",
            "Rear delt fly", "Dumbbell shrug", "Hammer curl", "Preacher curl",
            "Cable curl", "Incline dumbbell curl", "Overhead triceps extension", "Skull crusher",
            "Close-grip bench press", "Romanian deadlift", "Sumo deadlift", "Front squat",
            "Goblet squat", "Hack squat", "Bulgarian split squat", "Walking lunge",
            "Leg extension", "Seated leg curl", "Lying leg curl", "Hip thrust",
            "Standing calf raise", "Cable crunch"
        }) catalog.resolve(null, name);
        // Add identities without renaming or deleting existing records. Safe to run again.
        plans.findAll().forEach(plan -> plan.getExercises().forEach(exercise -> {
            if (exercise.getExerciseId() == null) exercise.linkExercise(catalog.resolve(null, exercise.getName()).getId());
        }));
        workouts.findAll().forEach(workout -> workout.getSets().forEach(set -> {
            if (set.getExerciseId() == null) set.linkExercise(catalog.resolve(null, set.getExerciseName()).getId());
        }));
    }
}
