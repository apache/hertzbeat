#!/bin/bash

TAG="$1"

if [ ! -n "$TAG" ]; then
    echo "MUST INPUT THE IMAGE TAG"
    exit 1
fi

echo "start pull and stop and replace hertz-beat container"
docker pull registry.cn-hangzhou.aliyuncs.com/tomsun28/hertz-beat:"$TAG"
docker stop hertz-beat
docker rm hertz-beat
docker run -d -p 11157:1157 --name hertz-beat registry.cn-hangzhou.aliyuncs.com/tomsun28/hertz-beat:"$TAG"