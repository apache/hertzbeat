FROM openjdk:11.0.16-jre-slim-buster

MAINTAINER tancloud "tomsun28@outlook.com"

ADD hertzbeat-1.2.4.tar /opt/

ENV TZ=Asia/Shanghai
#ENV LANG=zh_CN.UTF-8

EXPOSE 1157

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
