create table star
(
    id          int auto_increment comment '收藏id'
        primary key,
    user_id     int          not null comment '用户id',
    template_id int          not null comment '模版id',
    create_time varchar(255) not null,
    is_del      int          not null comment '取消标记，0为正常，1为取消'
);
