-- Scheduled SOP execution configurations
CREATE TABLE hzb_sop_schedule (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    sop_name VARCHAR(64) NOT NULL,
    sop_params VARCHAR(1024),
    cron_expression VARCHAR(64) NOT NULL,
    enabled SMALLINT DEFAULT 1,
    last_run_time TIMESTAMP,
    next_run_time TIMESTAMP,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE hzb_sop_schedule IS 'Scheduled SOP execution configurations';
COMMENT ON COLUMN hzb_sop_schedule.conversation_id IS 'Conversation ID to push results to';
COMMENT ON COLUMN hzb_sop_schedule.sop_name IS 'Name of the SOP skill to execute';
COMMENT ON COLUMN hzb_sop_schedule.sop_params IS 'SOP execution parameters in JSON format';
COMMENT ON COLUMN hzb_sop_schedule.cron_expression IS 'Cron expression for scheduling';
COMMENT ON COLUMN hzb_sop_schedule.enabled IS 'Whether the schedule is enabled';
COMMENT ON COLUMN hzb_sop_schedule.last_run_time IS 'Last execution time';
COMMENT ON COLUMN hzb_sop_schedule.next_run_time IS 'Next scheduled execution time';

CREATE INDEX idx_schedule_conversation_id ON hzb_sop_schedule(conversation_id);
CREATE INDEX idx_schedule_enabled_next ON hzb_sop_schedule(enabled, next_run_time);
