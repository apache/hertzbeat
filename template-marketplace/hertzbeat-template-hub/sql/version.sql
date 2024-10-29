create table version
(
    id          int auto_increment comment '版本id'
        primary key,
    template_id int          not null comment '模版id',
    version     varchar(255) not null comment '版本号，不允许修改',
    description varchar(255) not null comment '版本描述，todo：扩展为markdown文件地址',
    download    int          not null comment '下载量',
    create_time varchar(255) not null comment '创建时间',
    off_shelf   int          not null comment '是否下架',
    is_del      int          not null comment '是否删除',
    star        int          not null
)
    comment '版本表存放存储于minio中的object关键字信息，用用户名+template_id+版本号拼接，如果用户名允许修改或重复，则用用户id拼接';

create index template_isDel_idx
    on version (template_id, is_del);

create index template_version_idx
    on version (template_id, version)
    comment '通过该索引能够确定唯一数据';