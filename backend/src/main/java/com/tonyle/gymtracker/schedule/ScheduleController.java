package com.tonyle.gymtracker.schedule;

import com.tonyle.gymtracker.auth.CurrentUser;
import com.tonyle.gymtracker.plan.PlanRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedule")
@Transactional
public class ScheduleController {
    private final ScheduleRepository repository;
    private final PlanRepository plans;
    public ScheduleController(ScheduleRepository repository, PlanRepository plans) { this.repository = repository; this.plans = plans; }
    public record ScheduleRequest(@NotNull @Positive Long planId, @NotNull LocalDate date) {}
    public record ScheduleResponse(Long id, Long planId, String planName, LocalDate date, boolean planAvailable, UUID completedWorkoutId) {}

    @GetMapping public List<ScheduleResponse> all() {
        return repository.findByOwnerId(CurrentUser.id(), Sort.by("date", "id")).stream().map(this::response).toList();
    }
    @PostMapping public ResponseEntity<ScheduleResponse> create(@Valid @RequestBody ScheduleRequest request) {
        validateDate(request.date());
        var plan = plans.findById(request.planId()).filter(candidate -> CurrentUser.id().equals(candidate.getOwnerId())).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an existing workout plan"));
        var entry = new ScheduledWorkout(plan.getId(), plan.getName(), request.date());
        entry.assignOwner(CurrentUser.id()); entry = repository.saveAndFlush(entry);
        return ResponseEntity.created(URI.create("/api/schedule/" + entry.getId())).body(response(entry));
    }
    @PutMapping("/{id}") public ScheduleResponse update(@PathVariable Long id, @Valid @RequestBody ScheduleRequest request) {
        var entry = find(id);
        if (entry.getCompletedWorkoutId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Completed workouts cannot be rescheduled. Add a new schedule entry instead.");
        validateDate(request.date());
        var plan = plans.findById(request.planId()).filter(candidate -> CurrentUser.id().equals(candidate.getOwnerId())).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an existing workout plan"));
        entry.update(plan.getId(), plan.getName(), request.date()); repository.flush();
        return response(entry);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { repository.delete(find(id)); }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ProblemDetail duplicate(org.springframework.dao.DataIntegrityViolationException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "This plan is already scheduled for that date.");
    }
    private ScheduledWorkout find(Long id) { return repository.findById(id).filter(entry -> CurrentUser.id().equals(entry.getOwnerId())).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Scheduled workout not found")); }
    private ScheduleResponse response(ScheduledWorkout entry) {
        var plan = plans.findById(entry.getPlanId()).filter(item -> CurrentUser.id().equals(item.getOwnerId()));
        return new ScheduleResponse(entry.getId(), entry.getPlanId(), plan.map(item -> item.getName()).orElse(entry.getPlanName()), entry.getDate(), plan.isPresent(), entry.getCompletedWorkoutId());
    }
    private void validateDate(LocalDate date) {
        if (date.getYear() < 1900 || date.getYear() > 9999) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a date between 1900 and 9999");
    }
}
