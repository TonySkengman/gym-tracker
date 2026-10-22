package com.tonyle.gymtracker.workout;

import jakarta.validation.Valid;
import com.tonyle.gymtracker.exercise.ExerciseCatalog;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workouts")
@Transactional
public class WorkoutController {
    private final WorkoutRepository repository;
    private final ExerciseCatalog catalog;
    public WorkoutController(WorkoutRepository repository, ExerciseCatalog catalog) { this.repository = repository; this.catalog = catalog; }

    @GetMapping public List<WorkoutResponse> all() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "completedAt")).stream().map(WorkoutResponse::from).toList();
    }
    @GetMapping("/{id}") public WorkoutResponse get(@PathVariable UUID id) {
        return WorkoutResponse.from(find(id));
    }
    @PostMapping public ResponseEntity<WorkoutResponse> complete(@Valid @RequestBody WorkoutRequest request) {
        var existing = repository.findById(request.id());
        if (existing.isPresent()) return ResponseEntity.ok(WorkoutResponse.from(existing.get()));
        // Store a snapshot: changing or deleting a plan must not rewrite workout history.
        var session = repository.save(new WorkoutSession(resolve(request)));
        return ResponseEntity.created(URI.create("/api/workouts/" + session.getId())).body(WorkoutResponse.from(session));
    }
    @PutMapping("/{id}") public WorkoutResponse update(@PathVariable UUID id, @Valid @RequestBody WorkoutRequest request) {
        if (!id.equals(request.id())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workout ID must match the URL");
        var session = find(id); session.replaceExercises(resolve(request));
        return WorkoutResponse.from(session);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { repository.delete(find(id)); }
    private WorkoutSession find(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout not found"));
    }
    private WorkoutRequest resolve(WorkoutRequest request) {
        return new WorkoutRequest(request.id(), request.planId(), request.planName(), request.startedAt(), request.exercises().stream().map(item -> {
            var exercise = catalog.resolve(item.exerciseId(), item.name());
            return new WorkoutRequest.ExerciseRequest(exercise.getName(), item.targetReps(), item.sets(), exercise.getId(), item.skipped());
        }).toList());
    }
}
