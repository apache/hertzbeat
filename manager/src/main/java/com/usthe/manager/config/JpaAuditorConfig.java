package com.usthe.manager.config;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import org.jetbrains.annotations.NotNull;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;

import java.util.Optional;

/**
 * generate auditor for jpa auditing
 *
 *
 */
@Configuration
public class JpaAuditorConfig implements AuditorAware<String> {

    @NotNull
    @Override
    public Optional<String> getCurrentAuditor() {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        String username = null;
        if (subjectSum != null) {
            Object principal = subjectSum.getPrincipal();
            if (principal != null) {
                username = String.valueOf(principal);
            }
        }
        return Optional.ofNullable(username);
    }
}
