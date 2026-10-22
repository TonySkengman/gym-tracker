package com.tonyle.gymtracker.exercise;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {
    private final ExerciseRepository repository;
    private final ExerciseCatalog catalog;
    public ExerciseController(ExerciseRepository repository, ExerciseCatalog catalog) { this.repository = repository; this.catalog = catalog; }
    public record ExerciseRequest(@NotBlank @Size(max = 100) String name) {}
    @GetMapping public List<Exercise> all() { return repository.findAll(Sort.by("name")); }
    @PostMapping public ResponseEntity<Exercise> create(@Valid @RequestBody ExerciseRequest request) {
        var exercise = catalog.create(request.name());
        return ResponseEntity.created(URI.create("/api/exercises/" + exercise.getId())).body(exercise);
    }
}
