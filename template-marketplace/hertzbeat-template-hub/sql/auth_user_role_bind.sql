create table auth_user_role_bind
(
    id         bigint auto_increment
        primary key,
    gmt_create datetime(6) null,
    gmt_update datetime(6) null,
    role_id    bigint      not null,
    user_id    bigint      not null
);

INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (1, null, null, 2, 1);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (2, null, null, 2, 2);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (3, null, null, 2, 3);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (4, null, null, 2, 4);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (5, null, null, 2, 5);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (6, null, null, 2, 6);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (7, null, null, 2, 7);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (8, null, null, 2, 8);
