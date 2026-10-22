package com.tonyle.gymtracker;

import com.tonyle.gymtracker.plan.ApiErrors;
import com.tonyle.gymtracker.workout.*;
import org.junit.jupiter.api.*;
import com.tonyle.gymtracker.exercise.*;
import com.tonyle.gymtracker.schedule.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class WorkoutControllerTest extends AuthenticatedTest {
    private WorkoutRepository repository;
    private MockMvc mvc;
    private static final String BODY = """
        {"id":"4b6ca5aa-e309-4cff-94d3-d1e1e7519669","planId":1,"planName":"Upper body",
         "startedAt":"2026-01-01T10:00:00Z","exercises":[{"name":"Press","targetReps":8,
         "sets":[{"weight":12.5,"reps":8}]}]}
        """;
    @BeforeEach void setup() {
        repository = mock(WorkoutRepository.class);
        var exerciseRepository = mock(ExerciseRepository.class);
        when(exerciseRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var catalog = new ExerciseCatalog(exerciseRepository);
        mvc = MockMvcBuilders.standaloneSetup(new WorkoutController(repository, catalog, new ScheduleService(mock(ScheduleRepository.class)), mock(com.tonyle.gymtracker.plan.PlanRepository.class))).setControllerAdvice(new ApiErrors()).build();
    }
    @Test void completesWorkoutAndReturnsSnapshot() throws Exception {
        when(repository.findById(any())).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        mvc.perform(post("/api/workouts").contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isCreated()).andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.sets[0].weight").value(12.5)).andExpect(jsonPath("$.sets[0].reps").value(8));
    }
    @Test void rejectsInvalidAndIncompleteSets() throws Exception {
        for (String invalid : new String[] {
            BODY.replace("12.5", "-1"), BODY.replace("12.5", "2001"), BODY.replace("12.5", "1.234"),
            BODY.replace("12.5", "null"), BODY.replace("\"reps\":8", "\"reps\":0"),
            BODY.replace("\"reps\":8", "\"reps\":1.5"), BODY.replace("Upper body", " "),
            BODY.replace("2026-01-01T10:00:00Z", "2099-01-01T10:00:00Z"),
            BODY.replace("[{\"weight\":12.5,\"reps\":8}]", "[]")
        }) {
            mvc.perform(post("/api/workouts").contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(repository);
    }
    @Test void missingSessionReturns404() throws Exception {
        when(repository.findById(any())).thenReturn(Optional.empty());
        mvc.perform(get("/api/workouts/4b6ca5aa-e309-4cff-94d3-d1e1e7519669")).andExpect(status().isNotFound());
    }
    @Test void rejectsAllSkippedSessionsAndContradictorySkippedSets() throws Exception {
        String allSkipped = BODY.replace("\"sets\":[{\"weight\":12.5,\"reps\":8}]", "\"skipped\":true,\"sets\":[]");
        mvc.perform(post("/api/workouts").contentType(MediaType.APPLICATION_JSON).content(allSkipped)).andExpect(status().isBadRequest());
        String contradictory = BODY.replace("\"name\":\"Press\"", "\"name\":\"Press\",\"skipped\":true");
        mvc.perform(post("/api/workouts").contentType(MediaType.APPLICATION_JSON).content(contradictory)).andExpect(status().isBadRequest());
        verifyNoInteractions(repository);
    }
    @Test void rejectsMismatchedUpdateIdAndMissingDelete() throws Exception {
        mvc.perform(put("/api/workouts/9b6ca5aa-e309-4cff-94d3-d1e1e7519669").contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isBadRequest());
        when(repository.findById(any())).thenReturn(Optional.empty());
        mvc.perform(delete("/api/workouts/4b6ca5aa-e309-4cff-94d3-d1e1e7519669")).andExpect(status().isNotFound());
    }

}
