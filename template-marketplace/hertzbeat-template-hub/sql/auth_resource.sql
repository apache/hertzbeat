create table auth_resource
(
    id          bigint auto_increment
        primary key,
    name        varchar(100) not null,
    code        varchar(100) not null,
    method      varchar(255) not null,
    status      int          null,
    type        varchar(255) null,
    uri         varchar(255) not null,
    description varchar(255) null,
    gmt_create  datetime(6)  null,
    gmt_update  datetime(6)  null,
    check ((`status` >= 0) and (`status` <= 9))
);

INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (1, 'test', 'test', 'GET', 1, 'template', '/**/*', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (2, 'post', 'post', 'POST', 1, 'post', '/**/*', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (3, 'auth', 'auth', 'POST', 9, 'auth', '/api/auth/**', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (4, 'get-template', 'get-template', 'GET', 9, 'template-get', '/api/template/**', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (5, 'get-category', 'get-category', 'GET', 9, 'category-get', '/api/category/**', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (6, 'get-version', 'get-version', 'GET', 9, 'version-get', '/api/version/**', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (7, 'get-share', 'get-share', 'GET', 9, 'share-get', '/api/share/**', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (8, 'post-local', 'post-local', 'POST', 9, 'local', '/api/template/localFileUpload', null, null, null);
INSERT INTO hertzbeat_template_hub.auth_resource (id, name, code, method, status, type, uri, description, gmt_create, gmt_update) VALUES (9, 'get-star', 'get-star', 'GET', 9, 'star', '/api/star/isStar/**', null, null, null);
