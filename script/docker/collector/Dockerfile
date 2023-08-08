FROM openjdk:11.0.16-jre-slim-buster

ARG VERSION

MAINTAINER tancloud "tomsun28@outlook.com"

ADD hertzbeat-collector-${VERSION}.tar /opt/

#ENV TZ=Asia/Shanghai
#ENV LANG=zh_CN.UTF-8

WORKDIR /opt/hertzbeat-collector/

ENTRYPOINT ["./bin/entrypoint.sh"]
