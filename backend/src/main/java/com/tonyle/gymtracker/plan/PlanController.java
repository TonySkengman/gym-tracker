package com.tonyle.gymtracker.plan;
import jakarta.validation.Valid;
import com.tonyle.gymtracker.exercise.ExerciseCatalog;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.util.List;
@RestController
@RequestMapping("/api/plans")
@Transactional
public class PlanController {
    private final PlanRepository repository;
    private final ExerciseCatalog catalog;
    public PlanController(PlanRepository repository, ExerciseCatalog catalog) { this.repository = repository; this.catalog = catalog; }
    @GetMapping public List<PlanResponse> all() { return repository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream().map(PlanResponse::from).toList(); }
    @GetMapping("/{id}") public PlanResponse get(@PathVariable Long id) { return PlanResponse.from(find(id)); }
    @PostMapping public ResponseEntity<PlanResponse> create(@Valid @RequestBody PlanRequest request) {
        var plan = repository.save(new WorkoutPlan(resolve(request)));
        return ResponseEntity.created(URI.create("/api/plans/" + plan.getId())).body(PlanResponse.from(plan));
    }
    @PutMapping("/{id}") public PlanResponse update(@PathVariable Long id, @Valid @RequestBody PlanRequest request) {
        var plan = find(id); plan.update(resolve(request)); return PlanResponse.from(plan);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { repository.delete(find(id)); }
    private PlanRequest resolve(PlanRequest request) {
        return new PlanRequest(request.name(), request.description(), request.exercises().stream().map(item -> {
            var exercise = catalog.resolve(item.exerciseId(), item.name());
            return new PlanRequest.ExerciseRequest(exercise.getName(), item.targetSets(), item.targetReps(), exercise.getId());
        }).toList());
    }
    private WorkoutPlan find(Long id) { return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workout plan not found")); }
}
