#!/bin/bash

TAG="$1"

if [ ! -n "$TAG" ]; then
    echo "MUST INPUT THE IMAGE TAG"
    exit 1
fi

echo "start pull and stop and replace hertzbeat container"
docker pull registry.cn-hangzhou.aliyuncs.com/tomsun28/hertzbeat:"$TAG"
docker stop hertzbeat
docker rm hertzbeat
docker run -d -p 11157:1157 -v /home/ubuntu/hertzbeat/application.yml:/opt/hertzbeat/config/application.yml --name hertzbeat registry.cn-hangzhou.aliyuncs.com/tomsun28/hertzbeat:"$TAG"