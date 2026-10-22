package com.tonyle.gymtracker;

import com.tonyle.gymtracker.plan.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

// H2 exercises the real JPA mappings and transaction boundaries without Docker.
// A PostgreSQL end-to-end check is still required before deployment.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
    "spring.datasource.url=jdbc:h2:mem:plans;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class PlanPersistenceTest {
    @Autowired private PlanController controller;

    @Test void plansAndOrderedExercisesSurviveSeparateTransactions() {
        var request = new PlanRequest("Upper body", "Strength", List.of(
            new PlanRequest.ExerciseRequest("Bench press", 3, 8),
            new PlanRequest.ExerciseRequest("Row", 4, 10)));
        var created = controller.create(request).getBody();
        assertNotNull(created);
        Long id = created.id();
        assertNotNull(id);
        try {
            // Each controller call opens a separate transaction and reloads from the database.
            var loaded = controller.get(id);
            assertEquals("Upper body", loaded.name());
            assertEquals(List.of("Bench press", "Row"), loaded.exercises().stream().map(PlanResponse.ExerciseResponse::name).toList());
            assertTrue(controller.all().stream().anyMatch(plan -> plan.id().equals(id)));

            controller.update(id, new PlanRequest("Leg day", "", List.of(new PlanRequest.ExerciseRequest("Squat", 5, 5))));
            var updated = controller.get(id);
            assertEquals("Leg day", updated.name());
            assertEquals(1, updated.exercises().size());
            assertEquals("Squat", updated.exercises().getFirst().name());
            assertEquals(5, updated.exercises().getFirst().targetSets());
        } finally {
            controller.delete(id);
        }
        var missing = assertThrows(ResponseStatusException.class, () -> controller.get(id));
        assertEquals(404, missing.getStatusCode().value());
        assertTrue(controller.all().stream().noneMatch(plan -> plan.id().equals(id)));
    }
}
