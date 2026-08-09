-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.
--
-- Immutable V159 schema fixture for migration-chain tests.
-- Do not derive this fixture from the current baseline or later migrations.

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
        app varchar(255),
        metric varchar(255),
        field varchar(255),
        preset bit,
        priority integer,
        tags varchar(255),
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
        alert_fingerprints varchar(255),
        common_annotations varchar(255),
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
        instance varchar(5000),
        metric varchar(255),
        metrics varchar(255),
        monitor_id bigint,
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
        host varchar(100),
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
        message varchar(255) not null,
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

    create index index_alert_define_monitor
       on hzb_alert_define_monitor_bind (alert_define_id, monitor_id);

    alter table hzb_alert_group
       add constraint unique_group_key unique (group_key);

    create index idx_name
       on hzb_alert_group_converge (name);

    alter table hzb_alert_single
       add constraint unique_fingerprint unique (fingerprint);

    alter table hzb_collector
       add constraint uk_hzb_collector_name unique (name);

    create index index_collector_monitor
       on hzb_collector_monitor_bind (collector, monitor_id);





    create index history_query_index
       on hzb_history (monitor_id, app, metrics, metric);

    alter table hzb_metrics_favorite
       add constraint uk_hzb_metrics_favorite unique (creator, monitor_id, metrics_name);

    create index monitor_query_index
       on hzb_monitor (app, host, name);

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

    create index push_query_index
       on hzb_push_metrics (monitor_id, time);

    create index index_incident_component
       on hzb_status_page_incident_component_bind (incident_id);

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
