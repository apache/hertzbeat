package org.apache.hertzbeat.log.notice;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.springframework.util.StringUtils;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.AccessMode.READ_WRITE;

/**
 * Log filtering criteria for SSE (Server-Sent Events) log streaming
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Schema(description = "Log filtering criteria for SSE (Server-Sent Events) log streaming")
public class LogSseFilterCriteria {
    /**
     * Numerical value of the severity.
     * Smaller numerical values correspond to less severe events (such as debug events),
     * larger numerical values correspond to more severe events (such as errors and critical events).
     */
    @Schema(description = "Numerical value of the severity.", example = "1", accessMode = READ_WRITE)
    private Integer severityNumber;

    /**
     * The severity text (also known as log level).
     * This is the original string representation of the severity as it is known at the source.
     */
    @Schema(description = "The severity text (also known as log level).", example = "INFO", accessMode = READ_WRITE)
    private String severityText;
    
    /**
     * A unique identifier for a trace.
     * All spans from the same trace share the same trace_id.
     * The ID is a 16-byte array represented as a hex string.
     */
    @Schema(description = "A unique identifier for a trace.", example = "1234567890", accessMode = READ_WRITE)
    private String traceId;

    /**
     * A unique identifier for a span within a trace.
     * The ID is an 8-byte array represented as a hex string.
     */
    @Schema(description = "A unique identifier for a span.", example = "1234567890", accessMode = READ_WRITE)
    private String spanId;


    /**
     * Core filtering logic to determine if a log entry matches the criteria
     * @param log Log entry to be checked
     * @return boolean Whether the log entry matches the filter criteria
     */
    public boolean matches(LogEntry log) {
        // Check severity text match
        if (StringUtils.hasText(severityText) && !severityText.equalsIgnoreCase(log.getSeverityText())) {
            return false;
        }
        
        // Check severity number match (if both are present)
        if (severityNumber != null && log.getSeverityNumber() != null
                && !severityNumber.equals(log.getSeverityNumber())) {
            return false;
        }
        
        // Check trace ID match
        if (StringUtils.hasText(traceId) && !traceId.equalsIgnoreCase(log.getTraceId())) {
            return false;
        }
        
        // Check span ID match
        if (StringUtils.hasText(spanId) && !spanId.equalsIgnoreCase(log.getSpanId())) {
            return false;
        }
        return true;
    }
}