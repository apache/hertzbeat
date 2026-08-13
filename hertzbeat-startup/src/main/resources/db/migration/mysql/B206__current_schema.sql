-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.
--
-- Static V206 schema baseline for provisioning an empty MySQL target.
-- Future versioned migrations start at V207 or later.

    create table hzb_ai_conversation (
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        creator varchar(255),
        modifier varchar(255),
        title varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_ai_message (
        conversation_id bigint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        creator varchar(255),
        modifier varchar(255),
        role varchar(255),
        content longtext not null,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_alert_define (
        enable bit not null,
        period integer,
        times integer,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        datasource varchar(100),
        name varchar(100) not null,
        expr varchar(2048),
        labels varchar(2048),
        template varchar(2048),
        annotations varchar(4096),
        creator varchar(255),
        modifier varchar(255),
        type varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_alert_define_monitor_bind (
        alert_define_id bigint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        monitor_id bigint,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_alert_group (
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        common_labels varchar(2048),
        group_key varchar(2048) character set ascii,
        group_labels varchar(2048),
        alert_fingerprints TEXT,
        common_annotations TEXT,
        creator varchar(255),
        modifier varchar(255),
        status varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_alert_group_converge (
        enable bit,
        gmt_create datetime(6),
        gmt_update datetime(6),
        group_interval bigint,
        group_wait bigint,
        id bigint not null auto_increment,
        repeat_interval bigint,
        name varchar(100) not null,
        group_labels varchar(1024),
        creator varchar(255),
        modifier varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_alert_inhibit (
        enable bit,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        name varchar(100) not null,
        equal_labels varchar(2048),
        source_labels varchar(2048),
        target_labels varchar(2048),
        creator varchar(255),
        modifier varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_alert_silence (
        enable bit not null,
        match_all bit not null,
        times integer,
        type tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        period_end datetime(6),
        period_start datetime(6),
        name varchar(100) not null,
        labels varchar(2048),
        creator varchar(255),
        days varchar(255),
        modifier varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_alert_single (
        trigger_times integer,
        active_at bigint,
        end_at bigint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        start_at bigint,
        fingerprint varchar(2048) character set ascii,
        labels varchar(2048),
        annotations varchar(4096),
        content varchar(4096),
        creator varchar(255),
        modifier varchar(255),
        status varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_bulletin (
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        fields varchar(4096),
        monitor_ids varchar(4096),
        app varchar(255),
        creator varchar(255),
        modifier varchar(255),
        name varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_collector (
        status tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        creator varchar(255),
        ip varchar(255) not null,
        mode varchar(255),
        modifier varchar(255),
        name varchar(255) not null,
        version varchar(255),

        primary key (id),
        check ((status>=0))
    ) engine=InnoDB;

    create table hzb_collector_monitor_bind (
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        monitor_id bigint,
        collector varchar(255),
        creator varchar(255),
        modifier varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_config (
        gmt_create datetime(6),
        gmt_update datetime(6),

        content varchar(8192),
        creator varchar(255),
        modifier varchar(255),
        type varchar(255) not null,
        primary key (type)
    ) engine=InnoDB;

    create table hzb_define (
        gmt_create datetime(6),
        gmt_update datetime(6),
        app varchar(255) not null,
        creator varchar(255),
        modifier varchar(255),
        content longtext,
        primary key (app)
    ) engine=InnoDB;

    create table hzb_grafana_dashboard (
        enabled bit not null,
        monitor_id bigint not null,
        version bigint,
        folder_uid varchar(255),
        slug varchar(255),
        status varchar(255),
        uid varchar(255),
        url varchar(255),
        primary key (monitor_id)
    ) engine=InnoDB;

    create table hzb_history (
        dou float(53),
        int32 integer,
        metric_type tinyint,
        id bigint not null auto_increment,
        time bigint,
        str varchar(2048),
        app varchar(255),
        metric_labels varchar(5000),
        metric varchar(255),
        metrics varchar(255),
        instance varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_metrics_favorite (
        create_time datetime(6),
        id bigint not null auto_increment,
        monitor_id bigint not null,
        creator varchar(255) not null,
        metrics_name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_monitor (
        intervals integer,
        status tinyint not null,
        type tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null,
        job_id bigint,
        schedule_type varchar(20),
        app varchar(100),
        cron_expression varchar(100),
        instance varchar(100),
        name varchar(100),
        scrape varchar(100),
        annotations varchar(4096),
        labels varchar(4096),
        creator varchar(255),
        description varchar(255),
        modifier varchar(255),
        primary key (id),
        check ((status<=4) and (status>=0))
    ) engine=InnoDB;

    create table hzb_monitor_bind (
        biz_id bigint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        monitor_id bigint,
        creator varchar(255),
        key_str varchar(255),
        modifier varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_notice_receiver (
        agent_id integer,
        lark_receive_type tinyint,
        type tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        smn_ak varchar(22),
        smn_project_id varchar(32),
        smn_region varchar(32),
        smn_sk varchar(42),
        email varchar(100),
        name varchar(100) not null,
        phone varchar(100),
        access_token varchar(300),
        discord_bot_token varchar(300),
        discord_channel_id varchar(300),
        gotify_token varchar(300),
        hook_auth_token varchar(300),
        hook_auth_type varchar(300),
        server_chan_token varchar(300),
        slack_web_hook_url varchar(300),
        smn_topic_urn varchar(300),
        wechat_id varchar(300),
        hook_url varchar(1000),
        app_id varchar(255),
        app_secret varchar(255),
        chat_id varchar(255),
        corp_id varchar(255),
        creator varchar(255),
        modifier varchar(255),
        party_id varchar(255),
        tag_id varchar(255),
        tg_bot_token varchar(255),
        tg_message_thread_id varchar(255),
        tg_user_id varchar(255),
        user_id varchar(255),
        primary key (id),
        check ((type>=0))
    ) engine=InnoDB;

    create table hzb_notice_rule (
        enable bit not null,
        filter_all bit not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        period_end datetime(6),
        period_start datetime(6),
        template_id bigint,
        name varchar(100) not null,
        template_name varchar(100),
        labels varchar(2048),
        creator varchar(255),
        days varchar(255),
        modifier varchar(255),
        receiver_id varchar(255) not null,
        receiver_name varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_notice_template (
        preset boolean default false,
        type tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        name varchar(100) not null,
        creator varchar(255),
        modifier varchar(255),
        content text not null,
        primary key (id),
        check ((type>=0))
    ) engine=InnoDB;

    create table hzb_param (
        type tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        monitor_id bigint,
        field varchar(100) not null,
        param_value varchar(8126),
        primary key (id),
        check ((type>=0))
    ) engine=InnoDB;

    create table hzb_param_define (
        hide bit not null,
        param_limit smallint,
        required bit not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        name varchar(2048),
        param_options varchar(2048),
        app varchar(255),
        creator varchar(255),
        default_value varchar(255),
        depend varchar(255),
        field varchar(255),
        key_alias varchar(255),
        modifier varchar(255),
        param_range varchar(255),
        placeholder varchar(255),
        type varchar(255),
        value_alias varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_plugin_item (
        id bigint not null auto_increment,
        metadata_id bigint,
        class_identifier varchar(255),
        type enum ('POST_ALERT','POST_COLLECT'),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_plugin_metadata (
        enable_status bit,
        param_count integer,
        gmt_create datetime(6),
        id bigint not null auto_increment,
        creator varchar(255),
        jar_file_path varchar(255),
        name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_plugin_param (
        type tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        plugin_metadata_id bigint not null,
        field varchar(100) not null,
        param_value varchar(8126),
        primary key (id),
        check ((type>=0))
    ) engine=InnoDB;

    create table hzb_push_metrics (
        id bigint not null auto_increment,
        monitor_id bigint,
        time bigint,
        metrics varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_sop_schedule (
        id bigint not null auto_increment,
        conversation_id bigint not null comment 'Conversation ID to push results to',
        sop_name varchar(64) not null comment 'Name of the SOP skill to execute',
        sop_params varchar(1024) comment 'SOP execution parameters in JSON format',
        cron_expression varchar(64) not null comment 'Cron expression for scheduling',
        enabled tinyint default 1 comment 'Whether the schedule is enabled',
        last_run_time datetime comment 'Last execution time',
        next_run_time datetime comment 'Next scheduled execution time',
        creator varchar(64) comment 'Creator of this record',
        modifier varchar(64) comment 'Last modifier',
        gmt_create datetime default current_timestamp comment 'Create time',
        gmt_update datetime default current_timestamp on update current_timestamp comment 'Update time',
        primary key (id)
    ) engine=InnoDB;

    create table hzb_status_page_component (
        config_state tinyint not null,
        method tinyint not null,
        state tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        org_id bigint,
        labels varchar(4096),
        creator varchar(255),
        description varchar(255),
        modifier varchar(255),
        name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_status_page_history (
        abnormal integer,
        normal integer,
        state tinyint not null,
        unknowing integer,
        uptime float(53),
        component_id bigint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        timestamp bigint,
        creator varchar(255),
        modifier varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_status_page_incident (
        state tinyint not null,
        end_time bigint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        org_id bigint,
        start_time bigint,
        creator varchar(255),
        modifier varchar(255),
        name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_status_page_incident_component_bind (
        component_id bigint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        incident_id bigint,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_status_page_incident_content (
        state tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        incident_id bigint,
        timestamp bigint,
        creator varchar(255),
        message TEXT,
        modifier varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table hzb_status_page_org (
        state tinyint not null,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        color varchar(255),
        creator varchar(255),
        description varchar(255) not null,
        feedback varchar(255),
        home varchar(255) not null,
        logo varchar(255) not null,
        modifier varchar(255),
        name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table hzb_tag (
        type tinyint,
        gmt_create datetime(6),
        gmt_update datetime(6),
        id bigint not null auto_increment,
        tag_value varchar(2048),
        creator varchar(255),
        description varchar(255),
        modifier varchar(255),
        name varchar(255) not null,
        primary key (id),
        check ((type<=3) and (type>=0))
    ) engine=InnoDB;


    create index idx_message_conversation_id
       on hzb_ai_message (conversation_id);

    create index idx_alert_define_id
       on hzb_alert_define_monitor_bind (alert_define_id);

    create index idx_monitor_id
       on hzb_alert_define_monitor_bind (monitor_id);

    alter table hzb_alert_group
       add constraint unique_group_key unique (group_key);

    create index idx_name
       on hzb_alert_group_converge (name);

    alter table hzb_alert_single
       add constraint unique_fingerprint unique (fingerprint);

    alter table hzb_collector
       add constraint uk_hzb_collector_name unique (name);

    create index idx_collector_monitor_collector
       on hzb_collector_monitor_bind (collector);

    create index idx_collector_monitor_monitor_id
       on hzb_collector_monitor_bind (monitor_id);





    create index idx_hzb_history_instance
       on hzb_history (instance);

    create index idx_hzb_history_app
       on hzb_history (app);

    create index idx_hzb_history_metrics
       on hzb_history (metrics);

    create index idx_hzb_history_metric
       on hzb_history (metric);

    alter table hzb_metrics_favorite
       add constraint uk_hzb_metrics_favorite unique (creator, monitor_id, metrics_name);

    create index idx_hzb_monitor_app
       on hzb_monitor (app);

    create index idx_hzb_monitor_instance
       on hzb_monitor (instance);

    create index idx_hzb_monitor_name
       on hzb_monitor (name);

    create index index_monitor_bind
       on hzb_monitor_bind (biz_id);

    create index index_monitor_bin
       on hzb_monitor_bind (monitor_id);

    create index idx_hzb_param_monitor_id
       on hzb_param (monitor_id);

    alter table hzb_param
       add constraint uk_hzb_param_monitor_field unique (monitor_id, field);

    create index idx_hzb_plugin_param_plugin_metadata_id
       on hzb_plugin_param (plugin_metadata_id);

    alter table hzb_plugin_param
       add constraint uk_hzb_plugin_param_metadata_field unique (plugin_metadata_id, field);

    create index idx_push_metrics_monitor_id
       on hzb_push_metrics (monitor_id);

    create index idx_push_metrics_time
       on hzb_push_metrics (time);

    create index idx_schedule_conversation_id
       on hzb_sop_schedule (conversation_id);

    create index idx_schedule_enabled_next
       on hzb_sop_schedule (enabled, next_run_time);

    create index index_incident_component
       on hzb_status_page_incident_component_bind (incident_id);

    create index idx_incident_component_component_id
       on hzb_status_page_incident_component_bind (component_id);

    alter table hzb_ai_message
       add constraint fk_hzb_ai_message_conversation
       foreign key (conversation_id)
       references hzb_ai_conversation (id);

    alter table hzb_plugin_item
       add constraint fk_hzb_plugin_item_metadata
       foreign key (metadata_id)
       references hzb_plugin_metadata (id);

    alter table hzb_status_page_incident_content
       add constraint fk_hzb_incident_content_incident
       foreign key (incident_id)
       references hzb_status_page_incident (id);

CREATE TABLE hzb_entity (
    id BIGINT PRIMARY KEY COMMENT 'Entity ID',
    entity_type VARCHAR(32) NOT NULL COMMENT 'Entity type',
    name VARCHAR(128) NOT NULL COMMENT 'Entity name',
    display_name VARCHAR(128) COMMENT 'Entity display name',
    sub_type VARCHAR(128) COMMENT 'Entity subtype from HertzBeat v1 definition',
    namespace VARCHAR(128) COMMENT 'Namespace',
    environment VARCHAR(128) COMMENT 'Deployment environment',
    status VARCHAR(32) NOT NULL COMMENT 'Aggregated entity status',
    criticality VARCHAR(32) COMMENT 'Entity criticality',
    owner VARCHAR(128) COMMENT 'Entity owner',
    additional_owners TEXT COMMENT 'Additional owners json',
    runbook VARCHAR(512) COMMENT 'Runbook URL or identifier',
    lifecycle VARCHAR(64) COMMENT 'Entity lifecycle',
    tier VARCHAR(64) COMMENT 'Entity tier',
    system_name VARCHAR(128) COMMENT 'Owning system',
    component_of TEXT COMMENT 'Parent components or systems',
    components TEXT COMMENT 'Child components that belong to this system',
    implemented_by TEXT COMMENT 'ImplementedBy references json',
    api_interface TEXT COMMENT 'API interface definition json',
    inherit_from VARCHAR(255) COMMENT 'Entity inheritance reference',
    languages TEXT COMMENT 'Programming languages json',
    links TEXT COMMENT 'Entity links json',
    contacts TEXT COMMENT 'Entity contacts json',
    integrations TEXT COMMENT 'Entity integrations json',
    extensions TEXT COMMENT 'Entity custom extensions json',
    hertzbeat TEXT COMMENT 'HertzBeat definition blocks json',
    source VARCHAR(32) NOT NULL COMMENT 'Entity source',
    description VARCHAR(512) COMMENT 'Entity description',
    labels VARCHAR(4096) COMMENT 'Entity labels json',
    tags TEXT COMMENT 'Entity catalog tags json',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Entity workspace boundary',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    INDEX idx_hzb_entity_type (entity_type),
    INDEX idx_hzb_entity_status (status),
    INDEX idx_hzb_entity_name (name),
    INDEX idx_hzb_entity_owner (owner),
    INDEX idx_hzb_entity_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_identity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL COMMENT 'Entity ID',
    identity_type VARCHAR(32) NOT NULL COMMENT 'Identity source type',
    identity_key VARCHAR(128) NOT NULL COMMENT 'Identity key',
    identity_value VARCHAR(512) NOT NULL COMMENT 'Identity value',
    normalized_value VARCHAR(512) NOT NULL COMMENT 'Normalized identity value',
    priority INT NOT NULL DEFAULT 40 COMMENT 'Identity priority',
    primary_identity TINYINT NOT NULL DEFAULT 0 COMMENT 'Whether primary identity',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_identity (entity_id, identity_key, normalized_value),
    INDEX idx_hzb_entity_identity_lookup (identity_key, normalized_value),
    INDEX idx_hzb_entity_identity_entity (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_monitor_bind (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL COMMENT 'Entity ID',
    monitor_id BIGINT NOT NULL COMMENT 'Monitor ID',
    bind_type VARCHAR(32) NOT NULL COMMENT 'Bind type',
    bind_source VARCHAR(64) NOT NULL COMMENT 'Bind source',
    status VARCHAR(16) NOT NULL COMMENT 'Bind status',
    score INT NOT NULL DEFAULT 100 COMMENT 'Bind score',
    match_context TEXT COMMENT 'Matched identities json',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_monitor_bind (entity_id, monitor_id),
    INDEX idx_hzb_entity_monitor_bind_entity (entity_id),
    INDEX idx_hzb_entity_monitor_bind_monitor (monitor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_entity_id BIGINT NOT NULL COMMENT 'Source entity ID',
    target_entity_id BIGINT NULL COMMENT 'Target entity ID',
    target_ref VARCHAR(255) COMMENT 'Target entity reference',
    relation_type VARCHAR(32) NOT NULL COMMENT 'Relation type',
    relation_source VARCHAR(32) NOT NULL COMMENT 'Relation source',
    status VARCHAR(16) NOT NULL COMMENT 'Relation status',
    score INT NOT NULL DEFAULT 100 COMMENT 'Relation score',
    description VARCHAR(255) COMMENT 'Relation description',
    attributes TEXT COMMENT 'Relation attributes json',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_relation (source_entity_id, target_entity_id, relation_type),
    INDEX idx_hzb_entity_relation_source (source_entity_id),
    INDEX idx_hzb_entity_relation_target (target_entity_id),
    INDEX idx_hzb_entity_relation_target_ref (target_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_definition_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL COMMENT 'Entity ID',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Workspace ID',
    activity_type VARCHAR(32) NOT NULL COMMENT 'Definition activity type',
    format VARCHAR(16) NOT NULL COMMENT 'Definition format',
    status VARCHAR(16) NOT NULL COMMENT 'Activity status',
    summary VARCHAR(128) NOT NULL COMMENT 'Activity summary',
    detail VARCHAR(255) COMMENT 'Activity detail',
    creator VARCHAR(64) COMMENT 'Creator',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    INDEX idx_hzb_entity_definition_activity_entity (entity_id),
    INDEX idx_hzb_entity_definition_activity_workspace_time (workspace_id, gmt_create),
    INDEX idx_hzb_entity_definition_activity_time (gmt_create)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_governance_state (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    state_scope VARCHAR(32) NOT NULL COMMENT 'Governance scope, such as discovery',
    state_kind VARCHAR(32) NOT NULL COMMENT 'State kind, such as preset or activity',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Workspace ID',
    state_key VARCHAR(128) NOT NULL COMMENT 'Stable state key',
    state_name VARCHAR(128) COMMENT 'State display name',
    status VARCHAR(32) COMMENT 'State status',
    content TEXT COMMENT 'State JSON content',
    creator VARCHAR(64) COMMENT 'Creator',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_governance_state_scope_kind_workspace_key (state_scope, state_kind, workspace_id, state_key),
    INDEX idx_hzb_entity_governance_state_scope_kind (state_scope, state_kind),
    INDEX idx_hzb_entity_governance_state_scope_kind_workspace (state_scope, state_kind, workspace_id),
    INDEX idx_hzb_entity_governance_state_update (gmt_update),
    INDEX idx_hzb_entity_governance_state_creator (creator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_auth_token (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) COMMENT 'API token name',
    token_hash VARCHAR(128) NOT NULL COMMENT 'SHA-256 hash of token value',
    token_mask VARCHAR(64) COMMENT 'Masked token value for display',
    token_scope VARCHAR(32) NOT NULL DEFAULT 'api-admin' COMMENT 'Token access scope',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Token workspace boundary',
    status TINYINT NOT NULL DEFAULT 0 COMMENT 'Token status, 0 means active',
    creator VARCHAR(64) COMMENT 'Token creator',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    expire_time DATETIME NULL COMMENT 'Expire time, null means long-lived',
    last_used_time DATETIME NULL COMMENT 'Last used time',
    revoked_time DATETIME NULL COMMENT 'Token revoked time',
    revoked_by VARCHAR(64) COMMENT 'Token revoker',
    UNIQUE KEY uk_hzb_auth_token_hash (token_hash),
    INDEX idx_hzb_auth_token_creator (creator),
    INDEX idx_hzb_auth_token_scope (token_scope),
    INDEX idx_hzb_auth_token_workspace (workspace_id),
    INDEX idx_hzb_auth_token_scope_workspace (token_scope, workspace_id),
    INDEX idx_hzb_auth_token_status (status),
    INDEX idx_hzb_auth_token_revoked_by (revoked_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_signal_saved_view (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL COMMENT 'Saved view creator',
    `signal` VARCHAR(32) NOT NULL COMMENT 'Signal type: logs, traces, or metrics',
    view_key VARCHAR(128) NOT NULL COMMENT 'Stable saved view key',
    label VARCHAR(255) NOT NULL COMMENT 'Saved view display label',
    description VARCHAR(512) COMMENT 'Saved view description',
    route VARCHAR(2048) NOT NULL COMMENT 'Explorer route snapshot',
    query_snapshot TEXT COMMENT 'Query-state snapshot JSON',
    payload TEXT COMMENT 'Additional saved view payload JSON',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_signal_saved_view_signal_key (`signal`, view_key),
    INDEX idx_hzb_signal_saved_view_signal (`signal`),
    INDEX idx_hzb_signal_saved_view_update (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_signal_dashboard_panel_draft (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL COMMENT 'Panel draft creator',
    `signal` VARCHAR(32) NOT NULL COMMENT 'Signal type: logs, traces, or metrics',
    draft_key VARCHAR(128) NOT NULL COMMENT 'Stable dashboard panel draft key',
    title VARCHAR(255) NOT NULL COMMENT 'Dashboard panel title',
    description VARCHAR(512) COMMENT 'Dashboard panel description',
    visualization VARCHAR(32) NOT NULL COMMENT 'Dashboard panel visualization type',
    route VARCHAR(2048) NOT NULL COMMENT 'Explorer route snapshot',
    query_snapshot TEXT COMMENT 'Query-state snapshot JSON',
    payload TEXT COMMENT 'Additional dashboard panel payload JSON',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_signal_dashboard_panel_draft_creator_signal_key (creator, `signal`, draft_key),
    INDEX idx_hzb_signal_dashboard_panel_draft_creator_signal (creator, `signal`),
    INDEX idx_hzb_signal_dashboard_panel_draft_update (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_signal_dashboard (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL COMMENT 'Dashboard creator',
    dashboard_key VARCHAR(128) NOT NULL COMMENT 'Stable dashboard key',
    title VARCHAR(255) NOT NULL COMMENT 'Dashboard title',
    description VARCHAR(512) COMMENT 'Dashboard description',
    tags VARCHAR(512) COMMENT 'Comma-separated dashboard tags',
    layout TEXT NOT NULL COMMENT 'Dashboard layout JSON',
    widgets TEXT NOT NULL COMMENT 'Dashboard widgets JSON',
    variables TEXT COMMENT 'Dashboard variables JSON',
    panel_map TEXT COMMENT 'Dashboard panel grouping JSON',
    version VARCHAR(32) COMMENT 'Dashboard schema version',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_signal_dashboard_key (dashboard_key),
    INDEX idx_hzb_signal_dashboard_update (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE hzb_auth_token
    ADD COLUMN token_audience VARCHAR(32) NULL,
    ADD COLUMN collector_id VARCHAR(128) NULL,
    ADD COLUMN allowed_signals VARCHAR(64) NULL,
    ADD INDEX idx_hzb_auth_token_collector (collector_id);

ALTER TABLE hzb_collector ADD COLUMN runtime_config TEXT NULL;

ALTER TABLE hzb_collector ADD COLUMN instrumentation_intake TEXT NULL;

ALTER TABLE hzb_config ADD COLUMN config_revision VARCHAR(36) NULL;
UPDATE hzb_config SET config_revision = UUID() WHERE config_revision IS NULL;
ALTER TABLE hzb_config MODIFY COLUMN config_revision VARCHAR(36) NOT NULL;

CREATE TABLE IF NOT EXISTS hzb_account (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    roles VARCHAR(128) NOT NULL,
    credential_version BIGINT NOT NULL,
    disabled BOOLEAN NOT NULL,
    bootstrap_slot SMALLINT,
    CONSTRAINT uk_hzb_account_username UNIQUE (username),
    CONSTRAINT uk_hzb_account_bootstrap UNIQUE (bootstrap_slot)
);
CREATE TABLE IF NOT EXISTS hzb_installation (
    id SMALLINT PRIMARY KEY,
    installation_fingerprint VARCHAR(64) NOT NULL UNIQUE,
    complete BOOLEAN NOT NULL
);
