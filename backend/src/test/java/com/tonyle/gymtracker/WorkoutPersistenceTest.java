package com.tonyle.gymtracker;

import com.tonyle.gymtracker.plan.*;
import com.tonyle.gymtracker.workout.*;
import com.tonyle.gymtracker.exercise.*;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
    "spring.datasource.url=jdbc:h2:mem:workout-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class WorkoutPersistenceTest {
    @Autowired WorkoutController workouts;
    @Autowired WorkoutRepository repository;
    @Autowired PlanController plans;
    @Autowired ExerciseCatalog catalog;
    @Autowired ExerciseRepository exerciseRepository;
    @Autowired CatalogInitializer initializer;
    @Autowired PlanRepository planRepository;

    @Test void savesOrderedSnapshotsAcrossTransactionsAndRetriesWithoutDuplicates() {
        var plan = plans.create(new PlanRequest("Upper body", "", List.of(new PlanRequest.ExerciseRequest("Press", 2, 8)))).getBody();
        assertNotNull(plan);
        var request = new WorkoutRequest(UUID.randomUUID(), plan.id(), plan.name(), Instant.now().minusSeconds(60), List.of(
            new WorkoutRequest.ExerciseRequest("Press", 8, List.of(
                new WorkoutRequest.SetRequest(new BigDecimal("12.50"), BigDecimal.valueOf(8)), new WorkoutRequest.SetRequest(BigDecimal.ZERO, BigDecimal.valueOf(6)))),
            new WorkoutRequest.ExerciseRequest("Press", 10, List.of(new WorkoutRequest.SetRequest(new BigDecimal("20"), BigDecimal.TEN)))
        ));
        try {
            assertEquals(201, workouts.complete(request).getStatusCode().value());
            assertEquals(200, workouts.complete(request).getStatusCode().value());
            assertEquals(1, workouts.all().size());
            var loaded = workouts.get(request.id());
            assertEquals(3, loaded.sets().size());
            assertEquals(2, loaded.sets().get(1).setNumber());
            assertEquals(2, loaded.sets().get(2).exerciseNumber());
            assertEquals(0, new BigDecimal("12.50").compareTo(loaded.sets().getFirst().weight()));
            assertEquals(6, loaded.sets().get(1).reps());
            assertFalse(loaded.completedAt().isBefore(loaded.startedAt()));
            plans.update(plan.id(), new PlanRequest("Changed plan", "", List.of(new PlanRequest.ExerciseRequest("Squat", 3, 5))));
            plans.delete(plan.id());
            var history = workouts.get(request.id());
            assertEquals("Upper body", history.planName());
            assertEquals("Press", history.sets().getFirst().exerciseName());
        } finally {
            repository.deleteById(request.id());
        }
    }
    @Test void editsReplaceSetsAndSkipsWithoutChangingWorkoutDatesThenDeleteRemovesEverything() {
        var press = catalog.resolve(null, "Test stable press");
        var row = catalog.resolve(null, "Test stable row");
        var id = UUID.randomUUID();
        var request = new WorkoutRequest(id, 999L, "Snapshot", Instant.now().minusSeconds(120), List.of(
            new WorkoutRequest.ExerciseRequest(press.getName(), 8, List.of(new WorkoutRequest.SetRequest(BigDecimal.TEN, BigDecimal.TEN)), press.getId(), false),
            new WorkoutRequest.ExerciseRequest(row.getName(), 10, List.of(), row.getId(), true)));
        var created = workouts.complete(request).getBody();
        assertNotNull(created);
        assertEquals(1, created.sets().size());
        assertEquals(1, created.skippedExercises().size());
        assertEquals(row.getId(), created.skippedExercises().getFirst().exerciseId());
        try {
            var update = new WorkoutRequest(id, request.planId(), request.planName(), request.startedAt(), List.of(
                new WorkoutRequest.ExerciseRequest(press.getName(), 8, List.of(), press.getId(), true),
                new WorkoutRequest.ExerciseRequest(row.getName(), 10, List.of(
                    new WorkoutRequest.SetRequest(new BigDecimal("25.5"), BigDecimal.valueOf(8)),
                    new WorkoutRequest.SetRequest(new BigDecimal("30"), BigDecimal.valueOf(6))), row.getId(), false)));
            workouts.update(id, update);
            var reloaded = workouts.get(id);
            assertEquals(created.completedAt(), reloaded.completedAt());
            assertEquals(created.startedAt(), reloaded.startedAt());
            assertEquals(2, reloaded.sets().size());
            assertEquals(row.getId(), reloaded.sets().getFirst().exerciseId());
            assertEquals(2, reloaded.sets().getLast().setNumber());
            assertEquals(press.getId(), reloaded.skippedExercises().getFirst().exerciseId());
            assertEquals(0, new BigDecimal("25.5").compareTo(reloaded.sets().getFirst().weight()));
        } finally { workouts.delete(id); }
        assertThrows(ResponseStatusException.class, () -> workouts.get(id));
    }

    @Test void legacyBackfillPreservesNamesAndAddsStableIdentitiesIdempotently() {
        var legacyPlan = planRepository.save(new WorkoutPlan(new PlanRequest("Legacy", "", List.of(new PlanRequest.ExerciseRequest("  Legacy   PRESS ", 2, 8)))));
        var request = new WorkoutRequest(UUID.randomUUID(), legacyPlan.getId(), "Legacy", Instant.now().minusSeconds(60), List.of(
            new WorkoutRequest.ExerciseRequest("legacy press", 8, List.of(new WorkoutRequest.SetRequest(BigDecimal.TEN, BigDecimal.TEN)))));
        repository.save(new WorkoutSession(request));
        try {
            initializer.run(null);
            var planExercise = plans.get(legacyPlan.getId()).exercises().getFirst();
            var logged = workouts.get(request.id()).sets().getFirst();
            assertNotNull(planExercise.exerciseId());
            assertEquals(planExercise.exerciseId(), logged.exerciseId());
            assertEquals("legacy press", logged.exerciseName());
            long count = exerciseRepository.count();
            initializer.run(null);
            assertEquals(count, exerciseRepository.count());
            assertEquals(logged.exerciseId(), workouts.get(request.id()).sets().getFirst().exerciseId());
            assertThrows(ResponseStatusException.class, () -> catalog.create(" LEGACY   PRESS "));
        } finally { repository.deleteById(request.id()); planRepository.deleteById(legacyPlan.getId()); }
    }

}
