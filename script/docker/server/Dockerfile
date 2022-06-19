FROM openjdk:8-alpine3.9

MAINTAINER tomsun28 "tomsun28@outlook.com"

ADD hertzbeat-1.1.tar /opt/

RUN apk add --no-cache tzdata

ENV TZ=Asia/Shanghai

EXPOSE 1157

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
