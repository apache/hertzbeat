---
id: redis_cluster
title: Monitoring Redis Cluster
sidebar_label: Redis Cluster Monitor
keywords: [ open source monitoring tool, open source Redis Cluster monitoring tool, monitoring Redis Cluster metrics ]
---

### Pre-monitoring operations

1. create a empty folder and add two files.

   *redis.config*

   ```shell
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

2. View the IP addresses of all containers from the network, which is required when building a cluster.

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

3. Go inside the container to build a Redis cluster.

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

4. Specific operations.

   Add a redis monitor center, fill require parameters.

   ![HertzBeat](/img/docs/help/redis-cluster-add.png)

   final effect.

   ![HertzBeat](/img/docs/help/redis-cluster-view.png)

### Configuration Parameters

   Please see [REDIS](https://hertzbeat.apache.org/docs/help/redis) doc.
