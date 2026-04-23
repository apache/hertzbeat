---
id: mysql_account_expiry
title: "监控：MySQL 账户过期"
sidebar_label: "MySQL 账户过期"
keywords:
  - mysql 账户过期
  - mysql 密码过期
  - mysql 安全监控
---

> 监控 MySQL 数据库账户密码过期信息。

## 采集指标

### 指标集合：account_expiry

| 指标名称              | 指标单位 | 指标帮助说明                             |
|-----------------------|----------|------------------------------------------|
| user                  | 无       | MySQL 账户用户名                         |
| host                  | 无       | 允许该账户连接的主机                     |
| password_lifetime     | 天       | 密码有效期（天）                         |
| password_last_changed | 时间戳   | 上次修改密码的时间                       |
| password_expired      | 无       | 账户密码是否已过期（true/false）         |
| days_left             | 天       | 距离密码过期的剩余天数                   |
