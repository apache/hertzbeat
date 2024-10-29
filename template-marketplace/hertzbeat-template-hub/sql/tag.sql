create table tag
(
    id          int          not null comment 'tagid'
        primary key,
    name        varchar(255) not null comment 'tag名，不允许重复，允许修改',
    description varchar(255) not null comment '描述',
    create_time varchar(255) not null comment '创建时间',
    is_del      int          not null comment '删除标记'
);

