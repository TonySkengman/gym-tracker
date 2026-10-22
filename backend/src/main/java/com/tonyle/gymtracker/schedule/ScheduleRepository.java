package com.tonyle.gymtracker.schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface ScheduleRepository extends JpaRepository<ScheduledWorkout, Long> {
    java.util.List<ScheduledWorkout> findByOwnerId(Long ownerId, org.springframework.data.domain.Sort sort);

    List<ScheduledWorkout> findByCompletedWorkoutId(UUID workoutId);
}
