package com.tonyle.gymtracker.exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {
    Optional<Exercise> findByNormalizedName(String normalizedName);
}
