package com.tonyle.gymtracker.schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface ScheduleRepository extends JpaRepository<ScheduledWorkout, Long> {
    List<ScheduledWorkout> findByCompletedWorkoutId(UUID workoutId);
}
