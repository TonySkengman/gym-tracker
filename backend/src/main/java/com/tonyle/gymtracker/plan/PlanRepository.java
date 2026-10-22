package com.tonyle.gymtracker.plan;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PlanRepository extends JpaRepository<WorkoutPlan, Long> {
    java.util.List<WorkoutPlan> findByOwnerId(Long ownerId, org.springframework.data.domain.Sort sort);
}
