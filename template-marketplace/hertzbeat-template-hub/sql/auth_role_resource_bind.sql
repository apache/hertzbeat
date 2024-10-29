create table auth_role_resource_bind
(
    id          bigint auto_increment
        primary key,
    gmt_create  datetime(6) null,
    gmt_update  datetime(6) null,
    resource_id bigint      not null,
    role_id     bigint      not null
);

INSERT INTO hertzbeat_template_hub.auth_role_resource_bind (id, gmt_create, gmt_update, resource_id, role_id) VALUES (1, null, null, 1, 2);
INSERT INTO hertzbeat_template_hub.auth_role_resource_bind (id, gmt_create, gmt_update, resource_id, role_id) VALUES (2, null, null, 2, 2);
