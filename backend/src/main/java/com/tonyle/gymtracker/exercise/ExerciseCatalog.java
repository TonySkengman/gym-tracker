package com.tonyle.gymtracker.exercise;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Locale;

@Service
@Transactional
public class ExerciseCatalog {
    private final ExerciseRepository repository;
    public ExerciseCatalog(ExerciseRepository repository) { this.repository = repository; }
    public static String cleanName(String name) { return name.trim().replaceAll("\\s+", " "); }
    private static String key(String name) { return cleanName(name).toLowerCase(Locale.ROOT); }
    public Exercise resolve(Long id, String name) {
        if (id != null) return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exercise is not in the catalog"));
        // Support existing plans, old drafts and API clients that only have a name.
        return repository.findByNormalizedName(key(name)).orElseGet(() -> repository.save(new Exercise(cleanName(name), key(name))));
    }
    public Exercise create(String name) { return create(name, null, null); }
    public Exercise create(String name, java.util.List<String> primary, java.util.List<String> secondary) {
        if (repository.findByNormalizedName(key(name)).isPresent()) throw new ResponseStatusException(HttpStatus.CONFLICT, "An exercise with this name already exists");
        var exercise = new Exercise(cleanName(name), key(name));
        exercise.setMuscles(primary, secondary);
        return repository.save(exercise);
    }
}
