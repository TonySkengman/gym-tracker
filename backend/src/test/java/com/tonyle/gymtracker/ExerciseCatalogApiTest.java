package com.tonyle.gymtracker;

import com.tonyle.gymtracker.exercise.*;
import com.tonyle.gymtracker.workout.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.http.MediaType;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Full HTTP conversion/validation plus real JPA, without opening a network port.
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:catalog-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class ExerciseCatalogApiTest extends AuthenticatedTest {
    @Autowired WebApplicationContext context;
    @Autowired ExerciseCatalog catalog;
    @Autowired CatalogInitializer initializer;
    @Autowired ExerciseRepository exercises;
    @Autowired WorkoutController workouts;
    @Autowired JdbcTemplate jdbc;
    @Autowired com.tonyle.gymtracker.plan.PlanRepository plans;
    @Autowired WorkoutRepository sessions;
    @Autowired org.springframework.transaction.support.TransactionTemplate transaction;
    private MockMvc mvc;
    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    @Test void expandedCatalogPreservesExistingEntriesAcrossRestarts() throws Exception {
        var existing = catalog.resolve(null, "  LATERAL   RAISE ");
        long count = exercises.count();
        assertTrue(count >= 50);
        initializer.run(null);
        initializer.run(null);
        assertEquals(count, exercises.count());
        assertEquals(existing.getId(), catalog.resolve(null, "Lateral raise").getId());
        mvc.perform(get("/api/exercises")).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'Hip thrust')]").isNotEmpty())
            .andExpect(jsonPath("$[?(@.name == 'Cable crunch')]").isNotEmpty());
    }

    @Test void catalogCreatesCanonicalNamesAndRejectsDuplicatesOrInvalidInput() throws Exception {
        mvc.perform(get("/api/exercises")).andExpect(status().isOk()).andExpect(jsonPath("$[?(@.name == 'Bench press')]").isNotEmpty());
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  Cable   test row \"}"))
            .andExpect(status().isCreated()).andExpect(header().exists("Location")).andExpect(jsonPath("$.name").value("Cable test row"));
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"CABLE TEST ROW\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("An exercise with this name already exists"));
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \"}")).andExpect(status().isBadRequest());
    }

    @Test void muscleLabelsPersistValidateAndBackfillWithoutChangingIdentity() throws Exception {
        var bench = catalog.resolve(null, "bench press");
        assertEquals(java.util.List.of("Chest"), bench.getPrimaryMuscles());
        assertEquals(java.util.List.of("Triceps", "Front delts"), bench.getSecondaryMuscles());
        Long id = bench.getId();
        jdbc.update("delete from exercise_primary_muscles where exercise_id = ?", id);
        jdbc.update("delete from exercise_secondary_muscles where exercise_id = ?", id);
        initializer.run(null);
        var reloaded = exercises.findById(id).orElseThrow();
        assertEquals(id, reloaded.getId());
        assertEquals(java.util.List.of("Chest"), reloaded.getPrimaryMuscles());
        initializer.run(null);
        assertEquals(java.util.List.of("Chest"), exercises.findById(id).orElseThrow().getPrimaryMuscles());
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON).content("""
            {"name":"Custom muscle test press","primaryMuscles":[" Chest "],"secondaryMuscles":["Triceps","chest"]}
            """))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.primaryMuscles[0]").value("Chest"))
            .andExpect(jsonPath("$.secondaryMuscles.length()").value(1));
        var custom = catalog.resolve(null, "Custom muscle test press");
        initializer.run(null);
        assertEquals(java.util.List.of("Triceps"), exercises.findById(custom.getId()).orElseThrow().getSecondaryMuscles());
        mvc.perform(get("/api/exercises")).andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.name == 'Custom muscle test press')].primaryMuscles[0]").value("Chest"));
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Invalid muscles\",\"primaryMuscles\":[\" \"]}"))
            .andExpect(status().isBadRequest());
    }

    @Test void knownDuplicatesMergeWithoutLosingPlanHistoryOrSkippedExerciseData() {
        var names = java.util.List.of("Dumbell press", "Incline dumbbell bench press", "Pull ups");
        var legacy = names.stream().map(name -> exercises.saveAndFlush(new Exercise(name, name.toLowerCase(java.util.Locale.ROOT)))).toList();
        var plan = new com.tonyle.gymtracker.plan.WorkoutPlan(new com.tonyle.gymtracker.plan.PlanRequest("Legacy routine", "Keep this", java.util.List.of(
            new com.tonyle.gymtracker.plan.PlanRequest.ExerciseRequest(names.get(0), 3, 8, legacy.get(0).getId(), 90),
            new com.tonyle.gymtracker.plan.PlanRequest.ExerciseRequest(names.get(1), 2, 10, legacy.get(1).getId(), 60))));
        plan.assignOwner(987L);
        plan = plans.saveAndFlush(plan);
        var request = new WorkoutRequest(UUID.randomUUID(), plan.getId(), "Original snapshot", java.time.Instant.now().minusSeconds(300), java.util.List.of(
            new WorkoutRequest.ExerciseRequest(names.get(0), 8, java.util.List.of(new WorkoutRequest.SetRequest(new java.math.BigDecimal("42.50"), java.math.BigDecimal.valueOf(7))), legacy.get(0).getId(), false),
            new WorkoutRequest.ExerciseRequest(names.get(2), 10, java.util.List.of(), legacy.get(2).getId(), true)));
        var workout = new WorkoutSession(request);
        workout.assignOwner(987L);
        workout = sessions.saveAndFlush(workout);
        var completedAt = workout.getCompletedAt();
        var custom = exercises.saveAndFlush(new Exercise("Dumbell bench press", "dumbell bench press"));
        jdbc.update("insert into exercise_primary_muscles (exercise_id, muscle_order, muscle) values (?, 0, 'Custom chest')", custom.getId());
        var unknown = catalog.resolve(null, "Unspecified custom movement");
        var count = exercises.count();
        initializer.run(null);
        initializer.run(null);
        assertEquals(count - 3, exercises.count());
        legacy.forEach(item -> assertFalse(exercises.existsById(item.getId())));
        var press = catalog.resolve(null, "Dumbbell press");
        var incline = catalog.resolve(null, "Incline dumbbell press");
        var pull = catalog.resolve(null, "Pull-up");
        var planId = plan.getId();
        transaction.executeWithoutResult(status -> {
        var savedPlan = plans.findById(planId).orElseThrow();
        assertEquals(987L, savedPlan.getOwnerId());
        assertEquals("Keep this", savedPlan.getDescription());
        assertEquals(press.getId(), savedPlan.getExercises().get(0).getExerciseId());
        assertEquals(incline.getId(), savedPlan.getExercises().get(1).getExerciseId());
        assertEquals(90, savedPlan.getExercises().get(0).getRestSeconds());
        assertEquals(3, savedPlan.getExercises().get(0).getTargetSets());
        assertEquals(10, savedPlan.getExercises().get(1).getTargetReps());
        });
        var response = transaction.execute(status -> {
            var saved = sessions.findById(request.id()).orElseThrow();
            assertEquals(987L, saved.getOwnerId());
            return WorkoutResponse.from(saved);
        });
        assertEquals(completedAt, response.completedAt());
        assertEquals("Original snapshot", response.planName());
        assertEquals(press.getId(), response.sets().getFirst().exerciseId());
        assertEquals(names.get(0), response.sets().getFirst().exerciseName());
        assertEquals(new java.math.BigDecimal("42.50"), response.sets().getFirst().weight());
        assertEquals(7, response.sets().getFirst().reps());
        assertEquals(pull.getId(), response.skippedExercises().getFirst().exerciseId());
        assertEquals(2, response.skippedExercises().getFirst().exerciseNumber());
        assertEquals(java.util.List.of("Custom chest"), exercises.findById(custom.getId()).orElseThrow().getPrimaryMuscles());
        assertTrue(exercises.findById(unknown.getId()).orElseThrow().getPrimaryMuscles().isEmpty());
        assertEquals(press.getId(), catalog.resolve(legacy.get(0).getId(), names.get(0)).getId());
        assertEquals(pull.getId(), catalog.resolve(null, "Pull ups").getId());
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> catalog.create("Pull ups"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> catalog.resolve(Long.MAX_VALUE, "Unknown movement"));
        sessions.deleteById(request.id());
        plans.deleteById(plan.getId());
    }

    @Test void httpEditingAndDeletionPersistSkipsAndRemoveDependentRows() throws Exception {
        var performed = catalog.resolve(null, "HTTP test press");
        var skipped = catalog.resolve(null, "HTTP test row");
        var id = UUID.randomUUID();
        String body = """
            {"id":"%s","planId":123,"planName":"HTTP snapshot","startedAt":"2026-01-01T10:00:00Z",
             "exercises":[
               {"exerciseId":%d,"name":"Typo ignored when ID is supplied","targetReps":8,"sets":[{"weight":10,"reps":8}]},
               {"exerciseId":%d,"name":"HTTP test row","targetReps":10,"skipped":true,"sets":[]}
             ]}
            """.formatted(id, performed.getId(), skipped.getId());
        try {
            mvc.perform(post("/api/workouts").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.sets[0].exerciseName").value(performed.getName()))
                .andExpect(jsonPath("$.skippedExercises[0].exerciseId").value(skipped.getId().intValue()));
            var originalDate = workouts.get(id).completedAt();
            mvc.perform(put("/api/workouts/" + id).contentType(MediaType.APPLICATION_JSON).content(body.replace("\"weight\":10", "\"weight\":25.5")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sets[0].weight").value(25.5));
            mvc.perform(get("/api/workouts/" + id)).andExpect(status().isOk()).andExpect(jsonPath("$.skippedExercises.length()").value(1));
            assertEquals(originalDate, workouts.get(id).completedAt());
            mvc.perform(delete("/api/workouts/" + id)).andExpect(status().isNoContent());
            mvc.perform(get("/api/workouts/" + id)).andExpect(status().isNotFound());
            assertEquals(0L, jdbc.queryForObject("select count(*) from workout_sets where session_id = ?", Long.class, id));
            assertEquals(0L, jdbc.queryForObject("select count(*) from workout_skipped_exercises where session_id = ?", Long.class, id));
        } finally {
            try { workouts.delete(id); } catch (org.springframework.web.server.ResponseStatusException ignored) { }
        }
    }
}
