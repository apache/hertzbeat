FROM openjdk:11.0.15-jre-slim-buster

MAINTAINER tomsun28 "tomsun28@outlook.com"

ADD hertzbeat-1.1.1.tar /opt/

ENV TZ=Asia/Shanghai

EXPOSE 1157

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
