use tom ;
-- ----------------------------
-- Records of auth_resource
-- ----------------------------
insert into auth_resource (id, name, code, uri, type, method, status, description) values (101, 'User get token', 'ACCOUNT_TOKEN', '/auth/token', 'account', 'POST', 9, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (102, 'User register', 'ACCOUNT_REGISTER', '/auth/register', 'account', 'POST', 9, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (103, 'Add resource', 'ADD_RESOURCE', '/resource', 'resource', 'POST', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (104, 'Update resource', 'UPDATE_RESOURCE', '/resource', 'resource', 'PUT', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (105, 'Delete resource', 'DELETE_RESOURCE', '/resource/*', 'resource', 'DELETE', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (106, 'Get resource', 'GET_RESOURCES', '/resource/*/*', 'resource', 'GET', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (107, 'Add role', 'ADD_ROLE', '/role', 'role', 'POST', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (108, 'Update role', 'UPDATE_ROLE', '/role', 'role', 'PUT', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (109, 'Delete role', 'DELETE_ROLE', '/role/*', 'role', 'DELETE', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (110, 'Get role', 'GET_ROLES', '/role/*/*', 'role', 'GET', 1, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (111, 'User get custom token', 'ACCOUNT_CUSTOM_TOKEN', '/auth/custom/token', 'account', 'POST', 9, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (112, 'Static Resource', 'Static Resource', '/**/*.html', 'static', 'GET', 9, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (113, 'Static Resource', 'Static Resource', '/**/*.js', 'static', 'GET', 9, null);
insert into auth_resource (id, name, code, uri, type, method, status, description) values (114, 'Static Resource', 'Static Resource', '/**/*.css', 'static', 'GET', 9, null);

-- ----------------------------
-- Records of auth_role
-- ----------------------------
insert into auth_role (id, name, code, status, description) values (100, 'admin role', 'role_admin', 1, null);
insert into auth_role (id, name, code, status, description) values (102, 'user role', 'role_user', 1, null);
insert into auth_role (id, name, code, status, description) values (103, 'guest role', 'role_guest', 1, null);

-- ----------------------------
-- Records of auth_role_resource_bind
-- ----------------------------
-- role_admin has these resource
insert into auth_role_resource_bind (id, role_id, resource_id) values (1, 100, 101);
insert into auth_role_resource_bind (id, role_id, resource_id) values (2, 100, 102);
insert into auth_role_resource_bind (id, role_id, resource_id) values (3, 100, 103);
insert into auth_role_resource_bind (id, role_id, resource_id) values (4, 100, 104);
insert into auth_role_resource_bind (id, role_id, resource_id) values (5, 100, 105);
insert into auth_role_resource_bind (id, role_id, resource_id) values (6, 100, 106);
insert into auth_role_resource_bind (id, role_id, resource_id) values (7, 100, 107);
insert into auth_role_resource_bind (id, role_id, resource_id) values (8, 100, 108);
insert into auth_role_resource_bind (id, role_id, resource_id) values (9, 100, 109);
insert into auth_role_resource_bind (id, role_id, resource_id) values (10, 100, 110);

-- role_user has "get,add,update" related resources, do not have "delete" related resources
insert into auth_role_resource_bind (id, role_id, resource_id) values (11, 102, 103);
insert into auth_role_resource_bind (id, role_id, resource_id) values (12, 102, 104);
insert into auth_role_resource_bind (id, role_id, resource_id) values (13, 102, 106);
insert into auth_role_resource_bind (id, role_id, resource_id) values (14, 102, 107);
insert into auth_role_resource_bind (id, role_id, resource_id) values (15, 102, 108);
insert into auth_role_resource_bind (id, role_id, resource_id) values (16, 102, 110);

-- role_guest has "get" related resources
insert into auth_role_resource_bind (id, role_id, resource_id) values (17, 103, 106);
insert into auth_role_resource_bind (id, role_id, resource_id) values (18, 103, 110);


-- ----------------------------
-- Records of auth_user
-- ----------------------------
insert into  auth_user (id, username, password, salt, avatar, phone, email, sex, status, create_where) values (111, 'admin', 'admin', null, null, null, null, null, 1, 1);
insert into  auth_user (id, username, password, salt, avatar, phone, email, sex, status, create_where) values (112, 'user', 'user', null, null, null, null, null, 1, 1);
insert into  auth_user (id, username, password, salt, avatar, phone, email, sex, status, create_where) values (113, 'guest', 'guest', null, null, null, null, null, 1, 1);
insert into  auth_user (id, username, password, salt, avatar, phone, email, sex, status, create_where) values (114, 'noRole', 'noRole', null, null, null, null, null, 1, 1);



-- ----------------------------
-- Records of auth_user_role_bind
-- ----------------------------
insert into  auth_user_role_bind (id, user_id, role_id) values (12, 111, 100);
insert into  auth_user_role_bind (id, user_id, role_id) values (13, 111, 102);
insert into  auth_user_role_bind (id, user_id, role_id) values (14, 112, 102);
insert into  auth_user_role_bind (id, user_id, role_id) values (15, 113, 103);