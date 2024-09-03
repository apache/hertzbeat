---
id: redis_cluster  
title: 监控：Redis Cluster 数据库监控      
sidebar_label: Redis Cluster数据库   
keywords: [开源监控系统, 开源数据库监控, RedisCluster数据库监控]
---

### Pre-monitoring operations

1. 创建一个空目录, 然后在目录下添加以下两个文件.

   *redis.config*

   ```properties
     port 6379
     cluster-enabled yes
     cluster-config-file nodes.conf
     cluster-node-timeout 5000
     appendonly yes
     bind 0.0.0.0
     protected-mode no

   ```

   *docker-compose.yml*

   ```yml
   services:
     redis-master-1:
       image: redis:latest
       container_name: redis-master-1
       command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
       volumes:
         - ./redis.conf:/usr/local/etc/redis/redis.conf
       ports:
         - "1000:6379"

     redis-master-2:
       image: redis:latest
       container_name: redis-master-2
       command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
       volumes:
         - ./redis.conf:/usr/local/etc/redis/redis.conf
       ports:
         - "2000:6379"

     redis-master-3:
       image: redis:latest
       container_name: redis-master-3
       command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
       volumes:
         - ./redis.conf:/usr/local/etc/redis/redis.conf
       ports:
         - "3000:6379"

     redis-slave-1:
       image: redis:latest
       container_name: redis-slave-1
       command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
       volumes:
         - ./redis.conf:/usr/local/etc/redis/redis.conf
       ports:
         - "1001:6379"

     redis-slave-2:
       image: redis:latest
       container_name: redis-slave-2
       command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
       volumes:
         - ./redis.conf:/usr/local/etc/redis/redis.conf
       ports:
         - "2001:6379"

     redis-slave-3:
       image: redis:latest
       container_name: redis-slave-3
       command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
       volumes:
         - ./redis.conf:/usr/local/etc/redis/redis.conf
       ports:
         - "3001:6379"

   networks:
     default:
       external:
         name: hertzbeat-redis-cluster
   ```

2. 查看所有容器的 IP 地址，搭建 Redis 集群时需要用到这些.

   ```bash
   docker-compose up -d
   docker network inspect hertzbeat-redis-cluste
   ```

   ```json
   "Containers": {
               "187b879f73c473b3cbb82ff95f668e65af46115ddaa27f3ff1a712332b981531": {
                   ...
                   "Name": "redis-slave-2",
                   "IPv4Address": "192.168.117.6/24", 
                   ...
               },
               "45e22b64c82e51857fc104436cdd6cc0c5776ad10a2e4b9d8e52e36cfb87217e": {
                   ...
                   "Name": "redis-master-3",
                   "IPv4Address": "192.168.117.3/24
                   ...
               },
               "57838ae37956f8af181f9a131eb011efec332b9ed3d49480f59d8962ececf288": {
                   ...
                   "Name": "redis-master-2",
                   "IPv4Address": "192.168.117.7/24",
                   ...
               },
               "94478d14bd950bcde533134870beb89b392515843027a0595af56dd1e3305a76": {
                   ...
                   "Name": "redis-master-1",
                   "IPv4Address": "192.168.117.4/24",
                   ...
               },
               "ad055720747e7fc430ba794d5321723740eeb345c280073e4292ed4302ff657c": {
                   ...
                   "Name": "redis-slave-3",
                   "IPv4Address": "192.168.117.2/24",
                   ...
               },
               "eddded1ac4c7528640ba0c6befbdaa48faa7cb13905b934ca1f5c69ab364c725": {
                   ...
                   "Name": "redis-slave-1",
                   "IPv4Address": "192.168.117.5/24",
                   ...
               }
           },
   ```

3. 进入容器, 然后构建集群.

   ```bash
   docker exec -it redis-master-1 /bin/bash
   ```

   ```bash
   redis-cli --cluster create \
   192.168.117.4:6379 \
   192.168.117.7:6379 \
   192.168.117.3:6379 \
   192.168.117.5:6379 \
   192.168.117.6:6379 \
   192.168.117.2:6379 \
   --cluster-replicas 1
   ```

4. 最终的效果.

   添加监控节点时填入所需要的参数.

   ![HertzBeat](/img/docs/help/redis-cluster-add.png)

   最终的效果.

   ![HertzBeat](/img/docs/help/redis-cluster-view.png)

### Configuration Parameters

   查看 [REDIS](https://hertzbeat.apache.org/docs/help/redis) 文档.
