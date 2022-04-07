FROM openjdk:8-alpine

MAINTAINER tomsun28 "tomsun28@outlook.com"

ADD hertzbeat-1.0-beta.7.tar /opt/

RUN apk add --no-cache tzdata

ENV TZ=Asia/Shanghai

EXPOSE 1157

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
