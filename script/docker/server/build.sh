#!/bin/bash

VERSION="$1"

if [ ! -n "$VERSION" ]; then
    echo "MUST INPUT THE BUILD VERSION"
    exit 1
fi

cd `dirname $0`
# 当前脚本目录
CURRENT_DIR=`pwd`

cd ../../../manager/target
# 编译上下文目录
CONTEXT_DIR=`pwd`

echo "docker build -t tancloud/hertzbeat:$VERSION -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR"

docker build -t tancloud/hertzbeat:"$VERSION" -f $CURRENT_DIR/Dockerfile $CONTEXT_DIR
