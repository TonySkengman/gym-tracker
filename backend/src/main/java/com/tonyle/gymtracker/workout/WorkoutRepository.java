package com.tonyle.gymtracker.workout;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface WorkoutRepository extends JpaRepository<WorkoutSession, UUID> {}
