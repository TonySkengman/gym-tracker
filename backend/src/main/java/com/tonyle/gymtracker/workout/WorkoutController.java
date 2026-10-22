package com.tonyle.gymtracker.workout;

import jakarta.validation.Valid;
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
    public WorkoutController(WorkoutRepository repository) { this.repository = repository; }

    @GetMapping public List<WorkoutResponse> all() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "completedAt")).stream().map(WorkoutResponse::from).toList();
    }
    @GetMapping("/{id}") public WorkoutResponse get(@PathVariable UUID id) {
        return WorkoutResponse.from(repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout not found")));
    }
    @PostMapping public ResponseEntity<WorkoutResponse> complete(@Valid @RequestBody WorkoutRequest request) {
        var existing = repository.findById(request.id());
        if (existing.isPresent()) return ResponseEntity.ok(WorkoutResponse.from(existing.get()));
        // Store a snapshot: changing or deleting a plan must not rewrite workout history.
        var session = repository.save(new WorkoutSession(request));
        return ResponseEntity.created(URI.create("/api/workouts/" + session.getId())).body(WorkoutResponse.from(session));
    }
}
