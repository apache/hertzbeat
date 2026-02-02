-- Scheduled SOP execution configurations
CREATE TABLE hzb_sop_schedule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT NOT NULL COMMENT 'Conversation ID to push results to',
    sop_name VARCHAR(64) NOT NULL COMMENT 'Name of the SOP skill to execute',
    sop_params VARCHAR(1024) COMMENT 'SOP execution parameters in JSON format',
    cron_expression VARCHAR(64) NOT NULL COMMENT 'Cron expression for scheduling',
    enabled TINYINT DEFAULT 1 COMMENT 'Whether the schedule is enabled',
    last_run_time DATETIME COMMENT 'Last execution time',
    next_run_time DATETIME COMMENT 'Next scheduled execution time',
    creator VARCHAR(64) COMMENT 'Creator of this record',
    modifier VARCHAR(64) COMMENT 'Last modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    INDEX idx_schedule_conversation_id (conversation_id),
    INDEX idx_schedule_enabled_next (enabled, next_run_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
