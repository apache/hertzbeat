create table auth_role
(
    id          bigint auto_increment
        primary key,
    code        varchar(100) not null,
    description varchar(255) null,
    gmt_create  datetime(6)  null,
    gmt_update  datetime(6)  null,
    name        varchar(100) not null,
    status      int          null,
    check ((`status` >= 0) and (`status` <= 9))
);

INSERT INTO hertzbeat_template_hub.auth_role (id, code, description, gmt_create, gmt_update, name, status) VALUES (1, 'role_admin', null, null, null, 'admin role', 1);
INSERT INTO hertzbeat_template_hub.auth_role (id, code, description, gmt_create, gmt_update, name, status) VALUES (2, 'role_user', null, null, null, 'user role', 1);
