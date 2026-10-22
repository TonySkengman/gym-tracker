package com.tonyle.gymtracker.schedule;

import com.tonyle.gymtracker.auth.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@Transactional
public class ScheduleService {
    private final ScheduleRepository repository;
    public ScheduleService(ScheduleRepository repository) { this.repository = repository; }
    public void complete(Long scheduleId, Long planId, UUID workoutId) {
        if (scheduleId == null) return;
        // An entry may have been removed or reassigned while the workout was in progress.
        // Still save the workout, but do not complete a different plan's schedule entry.
        repository.findById(scheduleId).filter(entry -> CurrentUser.id().equals(entry.getOwnerId()) && entry.getPlanId().equals(planId) && entry.getCompletedWorkoutId() == null)
            .ifPresent(entry -> entry.complete(workoutId));
    }
    public void reopen(UUID workoutId) { repository.findByCompletedWorkoutId(workoutId).stream().filter(entry -> CurrentUser.id().equals(entry.getOwnerId())).forEach(ScheduledWorkout::reopen); }
}
