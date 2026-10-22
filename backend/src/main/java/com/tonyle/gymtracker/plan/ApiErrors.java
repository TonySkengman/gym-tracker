package com.tonyle.gymtracker.plan;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail status(ResponseStatusException exception) { return ProblemDetail.forStatusAndDetail(exception.getStatusCode(), exception.getReason() == null ? "Request could not be completed" : exception.getReason()); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail conflict(DataIntegrityViolationException exception) { return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "This record conflicts with existing data. Refresh and try again."); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException exception) {
        String detail = exception.getBindingResult().getAllErrors().stream()
            .map(error -> error.getDefaultMessage()).findFirst().orElse("Invalid workout plan");
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
    }
}
