package com.tonyle.gymtracker.exercise;

import com.tonyle.gymtracker.plan.PlanRepository;
import com.tonyle.gymtracker.workout.WorkoutRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CatalogInitializer implements ApplicationRunner {
    // Known old spellings only: do not guess muscles for arbitrary custom exercises.
    static final java.util.Map<String, String> LEGACY_NAMES = java.util.Map.ofEntries(
        java.util.Map.entry("dumbell press", "dumbbell press"),
        java.util.Map.entry("dumbbell bench press", "dumbbell press"),
        java.util.Map.entry("dumbell bench press", "dumbbell press"),
        java.util.Map.entry("incline dumbell press", "incline dumbbell press"),
        java.util.Map.entry("incline dumbbell bench press", "incline dumbbell press"),
        java.util.Map.entry("incline dumbell bench press", "incline dumbbell press"),
        java.util.Map.entry("pull ups", "pull-up"),
        java.util.Map.entry("pull up", "pull-up"),
        java.util.Map.entry("pull-ups", "pull-up"),
        java.util.Map.entry("pullups", "pull-up")
    );
    private final ExerciseRepository exercises;
    private final ExerciseCatalog catalog;
    private final PlanRepository plans;
    private final WorkoutRepository workouts;
    public CatalogInitializer(ExerciseCatalog catalog, PlanRepository plans, WorkoutRepository workouts, ExerciseRepository exercises) {
        this.exercises = exercises;
        this.catalog = catalog; this.plans = plans; this.workouts = workouts;
    }
    @Override @Transactional
    public void run(ApplicationArguments arguments) {
        var defaults = new java.util.HashMap<String, MuscleSeed>();
        // Backfill only missing labels, keeping existing exercise IDs and custom metadata.
        try (var input = new org.springframework.core.io.ClassPathResource("exercise-muscles.json").getInputStream()) {
            var seeds = tools.jackson.databind.json.JsonMapper.builder().build().readValue(input, MuscleSeed[].class);
            for (var seed : seeds) {
                defaults.put(ExerciseCatalog.cleanName(seed.name()).toLowerCase(java.util.Locale.ROOT), seed);
                var exercise = catalog.resolve(null, seed.name());
                if (exercise.getPrimaryMuscles().isEmpty() && exercise.getSecondaryMuscles().isEmpty())
                    exercise.setMuscles(seed.primaryMuscles(), seed.secondaryMuscles());
            }
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Cannot load default exercise muscles", exception);
        }
        // Link old name-only records before migrating known duplicate identities.
        plans.findAll().forEach(plan -> plan.getExercises().forEach(exercise -> {
            if (exercise.getExerciseId() == null) exercise.linkExercise(catalog.resolve(null, exercise.getName()).getId());
        }));
        workouts.findAll().forEach(workout -> {
            workout.getSets().forEach(set -> {
                if (set.getExerciseId() == null) set.linkExercise(catalog.resolve(null, set.getExerciseName()).getId());
            });
            workout.getSkippedExercises().forEach(skipped -> {
                if (skipped.getExerciseId() == null) skipped.linkExercise(catalog.resolve(null, skipped.getExerciseName()).getId());
            });
        });
        // Run after importing legacy plan/history names, so one restart repairs them too.
        exercises.findAll().forEach(exercise -> {
            if (!exercise.getPrimaryMuscles().isEmpty() || !exercise.getSecondaryMuscles().isEmpty()) return;
            var name = ExerciseCatalog.cleanName(exercise.getName()).toLowerCase(java.util.Locale.ROOT);
            var seed = defaults.get(LEGACY_NAMES.getOrDefault(name, name));
            if (seed != null) exercise.setMuscles(seed.primaryMuscles(), seed.secondaryMuscles());
        });
        mergeLegacyDuplicates();
    }

    private void mergeLegacyDuplicates() {
        var replacements = new java.util.HashMap<Long, Long>();
        var duplicates = new java.util.ArrayList<Exercise>();
        for (var exercise : exercises.findAll()) {
            var name = ExerciseCatalog.cleanName(exercise.getName()).toLowerCase(java.util.Locale.ROOT);
            var canonicalName = LEGACY_NAMES.get(name);
            if (canonicalName == null) continue;
            var canonical = exercises.findByNormalizedName(canonicalName).orElseThrow();
            // Distinct custom metadata may describe a different movement: preserve it.
            if (!new java.util.HashSet<>(exercise.getPrimaryMuscles()).equals(new java.util.HashSet<>(canonical.getPrimaryMuscles()))
                || !new java.util.HashSet<>(exercise.getSecondaryMuscles()).equals(new java.util.HashSet<>(canonical.getSecondaryMuscles()))) continue;
            replacements.put(exercise.getId(), canonical.getId());
            duplicates.add(exercise);
        }
        if (duplicates.isEmpty()) return;
        plans.findAll().forEach(plan -> plan.getExercises().forEach(exercise -> {
            var replacement = replacements.get(exercise.getExerciseId());
            if (replacement != null) exercise.linkExercise(replacement);
        }));
        workouts.findAll().forEach(workout -> {
            workout.getSets().forEach(set -> {
                var replacement = replacements.get(set.getExerciseId());
                if (replacement != null) set.linkExercise(replacement);
            });
            workout.getSkippedExercises().forEach(skipped -> {
                var replacement = replacements.get(skipped.getExerciseId());
                if (replacement != null) skipped.linkExercise(replacement);
            });
        });
        // One transaction: persist links before deleting catalog entries and muscle rows.
        plans.flush();
        workouts.flush();
        exercises.deleteAll(duplicates);
        exercises.flush();
    }
    public record MuscleSeed(String name, java.util.List<String> primaryMuscles, java.util.List<String> secondaryMuscles) {}
}
