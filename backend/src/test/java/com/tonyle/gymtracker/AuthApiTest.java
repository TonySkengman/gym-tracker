package com.tonyle.gymtracker;

import com.tonyle.gymtracker.auth.*;
import com.tonyle.gymtracker.plan.*;
import com.tonyle.gymtracker.workout.*;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.http.MediaType;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:auth-api;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AuthApiTest {
    @Autowired WebApplicationContext context;
    @Autowired @Qualifier("springSecurityFilterChain") Filter security;
    @Autowired AccountRepository accounts;
    @Autowired PasswordEncoder passwords;
    @Autowired PlanRepository plans;
    private MockMvc mvc;
    private static final String PLAN = "{\"name\":\"Private upper\",\"exercises\":[{\"name\":\"Bench press\",\"targetSets\":3,\"targetReps\":8}]}";
    @BeforeEach void setup() { mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(security).build(); }
    private class Client {
        MockHttpSession session;
        String token;
        void csrf() throws Exception {
            var result = mvc.perform(withSession(get("/api/auth/csrf"))).andExpect(status().isOk()).andReturn();
            session = (MockHttpSession) result.getRequest().getSession();
            token = JsonPath.read(result.getResponse().getContentAsString(), "$.token");
        }
        MockHttpServletRequestBuilder withSession(MockHttpServletRequestBuilder request) {
            return session == null ? request : request.session(session);
        }
        ResultActions send(MockHttpServletRequestBuilder request) throws Exception {
            return mvc.perform(withSession(request).header("X-CSRF-TOKEN", token).contentType(MediaType.APPLICATION_JSON));
        }
        void register(String email) throws Exception {
            csrf();
            send(post("/api/auth/register").content("{\"displayName\":\"Tony\",\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.passwordHash").doesNotExist());
            csrf();
        }
    }
    @Test void realSecurityChainProtectsSessionsAndIsolatesAllAccountData() throws Exception {
        mvc.perform(get("/api/plans")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isForbidden());
        var alice = new Client(); alice.register("Alice@example.com");
        var account = accounts.findByEmail("alice@example.com").orElseThrow();
        assertNotEquals("password123", account.getPasswordHash());
        assertTrue(passwords.matches("password123", account.getPasswordHash()));
        alice.send(get("/api/auth/me")).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("alice@example.com"));
        var created = alice.send(post("/api/plans").content(PLAN)).andExpect(status().isCreated()).andReturn();
        int planId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        var booking = alice.send(post("/api/schedule").content("{\"planId\":" + planId + ",\"date\":\"2026-12-01\"}"))
            .andExpect(status().isCreated()).andReturn();
        int scheduleId = JsonPath.read(booking.getResponse().getContentAsString(), "$.id");
        String workoutId = UUID.randomUUID().toString();
        String workout = "{\"id\":\"" + workoutId + "\",\"planId\":" + planId + ",\"planName\":\"Private upper\",\"startedAt\":\"2026-01-01T10:00:00Z\",\"scheduleId\":" + scheduleId + ",\"exercises\":[{\"name\":\"Bench press\",\"targetReps\":8,\"sets\":[{\"weight\":20,\"reps\":8}]}]}";
        alice.send(post("/api/workouts").content(workout)).andExpect(status().isCreated());
        var bob = new Client(); bob.register("bob@example.com");
        for (String path : new String[] {"/api/plans", "/api/workouts", "/api/schedule"})
            bob.send(get(path)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        bob.send(get("/api/plans/" + planId)).andExpect(status().isNotFound());
        bob.send(put("/api/plans/" + planId).content(PLAN)).andExpect(status().isNotFound());
        bob.send(delete("/api/plans/" + planId)).andExpect(status().isNotFound());
        bob.send(post("/api/schedule").content("{\"planId\":" + planId + ",\"date\":\"2026-12-02\"}")).andExpect(status().isBadRequest());
        bob.send(put("/api/schedule/" + scheduleId).content("{\"planId\":" + planId + ",\"date\":\"2026-12-02\"}")).andExpect(status().isNotFound());
        bob.send(delete("/api/schedule/" + scheduleId)).andExpect(status().isNotFound());
        bob.send(get("/api/workouts/" + workoutId)).andExpect(status().isNotFound());
        bob.send(put("/api/workouts/" + workoutId).content(workout)).andExpect(status().isNotFound());
        bob.send(delete("/api/workouts/" + workoutId)).andExpect(status().isNotFound());
        bob.send(post("/api/workouts").content(workout)).andExpect(status().isNotFound());
        bob.send(post("/api/workouts").content(workout.replace(workoutId, UUID.randomUUID().toString()))).andExpect(status().isNotFound());
        // An unowned pre-account plan is retained but invisible to both accounts.
        var legacy = plans.saveAndFlush(new WorkoutPlan(new PlanRequest("Legacy", "", java.util.List.of(new PlanRequest.ExerciseRequest("Squat", 3, 8)))));
        alice.send(get("/api/plans/" + legacy.getId())).andExpect(status().isNotFound());
        alice.send(get("/api/plans")).andExpect(jsonPath("$.length()").value(1));
        alice.send(get("/api/workouts")).andExpect(jsonPath("$.length()").value(1));
        bob.send(post("/api/auth/logout")).andExpect(status().isNoContent());
        assertTrue(bob.session.isInvalid());
        var returning = new Client(); returning.csrf();
        returning.send(post("/api/auth/login").content("{\"email\":\"BOB@example.com\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.detail").value("Incorrect email or password"));
        String oldSessionId = returning.session.getId();
        returning.send(post("/api/auth/login").content("{\"email\":\"BOB@example.com\",\"password\":\"password123\"}"))
            .andExpect(status().isOk());
        assertNotEquals(oldSessionId, returning.session.getId());
        returning.csrf();
        returning.send(get("/api/auth/me")).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("bob@example.com"));
        returning.send(post("/api/auth/register").content("{\"displayName\":\"Other\",\"email\":\"ALICE@example.com\",\"password\":\"password123\"}"))
            .andExpect(status().isConflict());
        returning.send(post("/api/auth/register").content("{\"displayName\":\"Other\",\"email\":\"bad\",\"password\":\"short\"}"))
            .andExpect(status().isBadRequest());
    }
}
