package com.tonyle.gymtracker;
import com.tonyle.gymtracker.plan.*;
import org.junit.jupiter.api.*;
import com.tonyle.gymtracker.exercise.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class PlanControllerTest {
    private PlanRepository repository;
    private MockMvc mvc;
    private static final String PLAN = """
        {"name":"Upper body","description":"Strength","exercises":[{"name":"Bench press","targetSets":3,"targetReps":8}]}
        """;
    @BeforeEach void setup() {
        repository = mock(PlanRepository.class);
        var exerciseRepository = mock(ExerciseRepository.class);
        when(exerciseRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var catalog = new ExerciseCatalog(exerciseRepository);
        mvc = MockMvcBuilders.standaloneSetup(new PlanController(repository, catalog)).setControllerAdvice(new ApiErrors()).build();
    }
    @Test void createReturnsPlanAndExercises() throws Exception {
        when(repository.save(any(WorkoutPlan.class))).thenAnswer(invocation -> invocation.getArgument(0));
        mvc.perform(post("/api/plans").contentType(MediaType.APPLICATION_JSON).content(PLAN))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Upper body"))
            .andExpect(jsonPath("$.exercises[0].targetSets").value(3));
    }
    @Test void invalidPlansAreRejectedBeforeSaving() throws Exception {
        for (String body : new String[] { PLAN.replace("Upper body", " "), PLAN.replace("\"targetSets\":3", "\"targetSets\":0"), PLAN.replace("\"targetReps\":8", "\"targetReps\":null"), "{\"name\":\"Empty\",\"exercises\":[]}" }) {
            mvc.perform(post("/api/plans").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(repository);
    }
    @Test void updateReplacesExercisesAndDeleteRemovesPlan() throws Exception {
        var plan = new WorkoutPlan(new PlanRequest("Old", "", java.util.List.of(new PlanRequest.ExerciseRequest("Squat", 5, 5))));
        when(repository.findById(1L)).thenReturn(Optional.of(plan));
        mvc.perform(put("/api/plans/1").contentType(MediaType.APPLICATION_JSON).content(PLAN))
            .andExpect(status().isOk()).andExpect(jsonPath("$.exercises.length()").value(1))
            .andExpect(jsonPath("$.exercises[0].name").value("Bench press"));
        mvc.perform(delete("/api/plans/1")).andExpect(status().isNoContent()); verify(repository).delete(plan);
    }
    @Test void missingPlanReturns404() throws Exception {
        when(repository.findById(99L)).thenReturn(Optional.empty());
        mvc.perform(get("/api/plans/99")).andExpect(status().isNotFound());
        mvc.perform(put("/api/plans/99").contentType(MediaType.APPLICATION_JSON).content(PLAN)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/plans/99")).andExpect(status().isNotFound());
    }
}
