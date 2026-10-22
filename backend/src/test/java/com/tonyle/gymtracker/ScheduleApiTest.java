package com.tonyle.gymtracker;

import com.tonyle.gymtracker.plan.*;
import com.tonyle.gymtracker.schedule.*;
import com.tonyle.gymtracker.workout.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:schedule-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class ScheduleApiTest {
    @Autowired WebApplicationContext context;
    @Autowired PlanController plans;
    @Autowired ScheduleController schedule;
    @Autowired ScheduleRepository repository;
    @Autowired WorkoutController workouts;
    private MockMvc mvc;
    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).build(); }
    private PlanResponse plan(String name) {
        return plans.create(new PlanRequest(name, "", List.of(new PlanRequest.ExerciseRequest("Schedule test press", 1, 8)))).getBody();
    }
    private WorkoutRequest workout(PlanResponse plan, Long scheduleId) {
        return new WorkoutRequest(UUID.randomUUID(), plan.id(), plan.name(), Instant.now().minusSeconds(60), List.of(
            new WorkoutRequest.ExerciseRequest("Schedule test press", 8, List.of(new WorkoutRequest.SetRequest(BigDecimal.TEN, BigDecimal.valueOf(8))))), scheduleId);
    }
    @AfterEach void cleanup() { repository.deleteAll(); }

    @Test void createsDateOnlyEntriesReschedulesAndRejectsDuplicatePlansOnSameDate() throws Exception {
        var first = plan("Schedule upper"); var second = plan("Schedule lower");
        try {
            String body = "{\"planId\":" + first.id() + ",\"date\":\"2026-10-25\"}";
            String location = mvc.perform(post("/api/schedule").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.date").value("2026-10-25"))
                .andExpect(jsonPath("$.planName").value(first.name())).andExpect(jsonPath("$.planAvailable").value(true))
                .andReturn().getResponse().getHeader("Location");
            assertNotNull(location);
            mvc.perform(post("/api/schedule").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
            mvc.perform(post("/api/schedule").contentType(MediaType.APPLICATION_JSON).content(body.replace("\"planId\":" + first.id(), "\"planId\":" + second.id()))).andExpect(status().isCreated());
            mvc.perform(put(location).contentType(MediaType.APPLICATION_JSON).content(body.replace("2026-10-25", "2026-11-01")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.date").value("2026-11-01"));
            mvc.perform(get("/api/schedule")).andExpect(status().isOk()).andExpect(jsonPath("$[0].planId").value(second.id().intValue()));
            mvc.perform(delete(location)).andExpect(status().isNoContent());
            mvc.perform(delete(location)).andExpect(status().isNotFound());
        } finally { plans.delete(first.id()); plans.delete(second.id()); }
    }
    @Test void rejectsInvalidDatesMissingPlansAndUnknownEntries() throws Exception {
        for (String body : List.of("{}", "{\"planId\":-1,\"date\":\"2026-10-22\"}", "{\"planId\":999999,\"date\":\"2026-10-22\"}", "{\"planId\":1,\"date\":\"2026-02-30\"}", "{\"planId\":1,\"date\":\"1899-01-01\"}")) {
            mvc.perform(post("/api/schedule").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
        mvc.perform(delete("/api/schedule/999999")).andExpect(status().isNotFound());
        mvc.perform(put("/api/schedule/999999").contentType(MediaType.APPLICATION_JSON).content("{\"planId\":1,\"date\":\"2026-10-22\"}")).andExpect(status().isNotFound());
    }
    @Test void deletedPlansRemainVisibleAndCanBeReassigned() throws Exception {
        var original = plan("Deleted scheduled plan"); var replacement = plan("Replacement scheduled plan");
        var entry = schedule.create(new ScheduleController.ScheduleRequest(original.id(), LocalDate.of(2026, 10, 22))).getBody();
        assertNotNull(entry);
        plans.delete(original.id());
        try {
            mvc.perform(get("/api/schedule")).andExpect(status().isOk()).andExpect(jsonPath("$[0].planAvailable").value(false)).andExpect(jsonPath("$[0].planName").value(original.name()));
            schedule.update(entry.id(), new ScheduleController.ScheduleRequest(replacement.id(), entry.date()));
            assertTrue(schedule.all().getFirst().planAvailable());
            schedule.delete(entry.id());
            assertNotNull(plans.get(replacement.id()));
        } finally { plans.delete(replacement.id()); }
    }
    @Test void finishingMarksCompleteAndDeletingWorkoutReopensSchedule() throws Exception {
        var plan = plan("Linked scheduled plan");
        var entry = schedule.create(new ScheduleController.ScheduleRequest(plan.id(), LocalDate.of(2026, 10, 22))).getBody();
        assertNotNull(entry);
        var request = workout(plan, entry.id());
        try {
            workouts.complete(request);
            assertEquals(request.id(), schedule.all().getFirst().completedWorkoutId());
            workouts.complete(request);
            assertEquals(request.id(), schedule.all().getFirst().completedWorkoutId());
            mvc.perform(put("/api/schedule/" + entry.id()).contentType(MediaType.APPLICATION_JSON).content("{\"planId\":" + plan.id() + ",\"date\":\"2026-10-23\"}")).andExpect(status().isConflict());
            workouts.delete(request.id());
            assertNull(schedule.all().getFirst().completedWorkoutId());
            assertThrows(ResponseStatusException.class, () -> workouts.get(request.id()));
        } finally { try { workouts.delete(request.id()); } catch (ResponseStatusException ignored) { } plans.delete(plan.id()); }
    }
    @Test void removingScheduleKeepsHistoryAndReassignmentDoesNotCompleteTheWrongPlan() {
        var first = plan("Original scheduled source"); var second = plan("Reassigned scheduled source");
        var entry = schedule.create(new ScheduleController.ScheduleRequest(first.id(), LocalDate.of(2026, 10, 22))).getBody();
        assertNotNull(entry);
        var request = workout(first, entry.id());
        try {
            schedule.update(entry.id(), new ScheduleController.ScheduleRequest(second.id(), entry.date()));
            workouts.complete(request);
            assertNull(schedule.all().getFirst().completedWorkoutId());
            schedule.delete(entry.id());
            assertNotNull(workouts.get(request.id()));
        } finally { workouts.delete(request.id()); plans.delete(first.id()); plans.delete(second.id()); }
    }
}
