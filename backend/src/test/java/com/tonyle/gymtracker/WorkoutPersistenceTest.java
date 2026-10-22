package com.tonyle.gymtracker;

import com.tonyle.gymtracker.plan.*;
import com.tonyle.gymtracker.workout.*;
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
}
