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
        // Backfill only missing labels, keeping existing exercise IDs and custom metadata.
        try (var input = new org.springframework.core.io.ClassPathResource("exercise-muscles.json").getInputStream()) {
            var seeds = tools.jackson.databind.json.JsonMapper.builder().build().readValue(input, MuscleSeed[].class);
            for (var seed : seeds) {
                var exercise = catalog.resolve(null, seed.name());
                if (exercise.getPrimaryMuscles().isEmpty() && exercise.getSecondaryMuscles().isEmpty())
                    exercise.setMuscles(seed.primaryMuscles(), seed.secondaryMuscles());
            }
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Cannot load default exercise muscles", exception);
        }
        // Add identities without renaming or deleting existing records. Safe to run again.
        plans.findAll().forEach(plan -> plan.getExercises().forEach(exercise -> {
            if (exercise.getExerciseId() == null) exercise.linkExercise(catalog.resolve(null, exercise.getName()).getId());
        }));
        workouts.findAll().forEach(workout -> workout.getSets().forEach(set -> {
            if (set.getExerciseId() == null) set.linkExercise(catalog.resolve(null, set.getExerciseName()).getId());
        }));
    }
    public record MuscleSeed(String name, java.util.List<String> primaryMuscles, java.util.List<String> secondaryMuscles) {}
}
