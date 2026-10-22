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
class ExerciseCatalogApiTest {
    @Autowired WebApplicationContext context;
    @Autowired ExerciseCatalog catalog;
    @Autowired WorkoutController workouts;
    @Autowired JdbcTemplate jdbc;
    private MockMvc mvc;
    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }

    @Test void catalogCreatesCanonicalNamesAndRejectsDuplicatesOrInvalidInput() throws Exception {
        mvc.perform(get("/api/exercises")).andExpect(status().isOk()).andExpect(jsonPath("$[?(@.name == 'Bench press')]").isNotEmpty());
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  Cable   test row \"}"))
            .andExpect(status().isCreated()).andExpect(header().exists("Location")).andExpect(jsonPath("$.name").value("Cable test row"));
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"CABLE TEST ROW\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("An exercise with this name already exists"));
        mvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \"}")).andExpect(status().isBadRequest());
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
