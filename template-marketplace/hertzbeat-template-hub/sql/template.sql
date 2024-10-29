create table template
(
    id          int auto_increment
        primary key,
    name        varchar(255) not null comment '模版名，不允许修改，不同用户间可以重复',
    description varchar(255) not null comment '模版描述',
    latest      int          not null comment '最终版本id',
    user        int          not null comment '用户id',
    category_id int          not null comment '模版类别id',
    tag         int          not null comment '模版-tag表id，这个字段废弃，查询tag时直接去关联表中查询即可',
    download    int          not null comment '下载量',
    create_time varchar(255) not null comment '创建时间',
    update_time varchar(255) not null comment '更新时间',
    off_shelf   int          not null comment '下架标记，0为正常，1为下架',
    is_del      int          not null comment '删除标记，0为正常，1为删除',
    star        int          not null
);

create index name_user_idx
    on template (name, user)
    comment '模版名+用户id的联合索引';

create index user_idx
    on template (user);

create index user_isDel_idx
    on template (user, is_del);
