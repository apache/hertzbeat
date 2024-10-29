create table template_tag
(
    id       int not null comment 'template-tag id'
        primary key,
    template int not null comment 'template id',
    tag      int not null comment 'tag id'
);

