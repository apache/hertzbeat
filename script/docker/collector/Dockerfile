FROM openjdk:11.0.16-jre-slim-buster

MAINTAINER tancloud "tomsun28@outlook.com"

ADD hertzbeat-collector-1.3.2.tar /opt/

ENV TZ=Asia/Shanghai
#ENV LANG=zh_CN.UTF-8

EXPOSE 1159

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
