package org.apache.hertzbeat.common.entity.manager;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Manager Message Entity
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ManagerMessage {
    /**
     * Notify Level {@see NotifyLevelEnum}
     */
    private String notifyLevel;

    /**
     * Manager Event Type {@see ManagerEventTypeEnum}
     */
    private String managerEventType;

    /**
     * Message Content
     */
    private String content;
}