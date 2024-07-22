"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[6755],{15680:(e,a,t)=>{t.d(a,{xA:()=>p,yg:()=>u});var n=t(96540);function r(e,a,t){return a in e?Object.defineProperty(e,a,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[a]=t,e}function o(e,a){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);a&&(n=n.filter((function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable}))),t.push.apply(t,n)}return t}function i(e){for(var a=1;a<arguments.length;a++){var t=null!=arguments[a]?arguments[a]:{};a%2?o(Object(t),!0).forEach((function(a){r(e,a,t[a])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(t,a))}))}return e}function l(e,a){if(null==e)return{};var t,n,r=function(e,a){if(null==e)return{};var t,n,r={},o=Object.keys(e);for(n=0;n<o.length;n++)t=o[n],a.indexOf(t)>=0||(r[t]=e[t]);return r}(e,a);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)t=o[n],a.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(r[t]=e[t])}return r}var s=n.createContext({}),c=function(e){var a=n.useContext(s),t=a;return e&&(t="function"==typeof e?e(a):i(i({},a),e)),t},p=function(e){var a=c(e.components);return n.createElement(s.Provider,{value:a},e.children)},d={inlineCode:"code",wrapper:function(e){var a=e.children;return n.createElement(n.Fragment,{},a)}},m=n.forwardRef((function(e,a){var t=e.components,r=e.mdxType,o=e.originalType,s=e.parentName,p=l(e,["components","mdxType","originalType","parentName"]),m=c(t),u=r,y=m["".concat(s,".").concat(u)]||m[u]||d[u]||o;return t?n.createElement(y,i(i({ref:a},p),{},{components:t})):n.createElement(y,i({ref:a},p))}));function u(e,a){var t=arguments,r=a&&a.mdxType;if("string"==typeof e||r){var o=t.length,i=new Array(o);i[0]=m;var l={};for(var s in a)hasOwnProperty.call(a,s)&&(l[s]=a[s]);l.originalType=e,l.mdxType="string"==typeof e?e:r,i[1]=l;for(var c=2;c<o;c++)i[c]=t[c];return n.createElement.apply(null,i)}return n.createElement.apply(null,t)}m.displayName="MDXCreateElement"},28833:(e,a,t)=>{t.r(a),t.d(a,{assets:()=>s,contentTitle:()=>i,default:()=>d,frontMatter:()=>o,metadata:()=>l,toc:()=>c});var n=t(58168),r=(t(96540),t(15680));const o={id:"mysql-change",title:"Use MYSQL Replace H2 Database to Store Metadata(Optional)",sidebar_label:"Use MYSQL Instead of H2"},i=void 0,l={unversionedId:"start/mysql-change",id:"version-v1.5.x/start/mysql-change",title:"Use MYSQL Replace H2 Database to Store Metadata(Optional)",description:"MYSQL is a reliable relational database. In addition to default built-in H2 database, Apache HertzBeat (incubating) allow you to use MYSQL to store structured relational data such as monitoring information, alarm information and configuration information.",source:"@site/versioned_docs/version-v1.5.x/start/mysql-change.md",sourceDirName:"start",slug:"/start/mysql-change",permalink:"/docs/v1.5.x/start/mysql-change",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.5.x/start/mysql-change.md",tags:[],version:"v1.5.x",frontMatter:{id:"mysql-change",title:"Use MYSQL Replace H2 Database to Store Metadata(Optional)",sidebar_label:"Use MYSQL Instead of H2"},sidebar:"docs",previous:{title:"Use InfluxDB Store Metrics",permalink:"/docs/v1.5.x/start/influxdb-init"},next:{title:"Use PostgreSQL Instead of H2",permalink:"/docs/v1.5.x/start/postgresql-change"}},s={},c=[{value:"Install MYSQL via Docker",id:"install-mysql-via-docker",level:3},{value:"Database creation",id:"database-creation",level:3},{value:"Modify hertzbeat&#39;s configuration file application.yml and switch data source",id:"modify-hertzbeats-configuration-file-applicationyml-and-switch-data-source",level:3}],p={toc:c};function d(e){let{components:a,...t}=e;return(0,r.yg)("wrapper",(0,n.A)({},p,t,{components:a,mdxType:"MDXLayout"}),(0,r.yg)("p",null,"MYSQL is a reliable relational database. In addition to default built-in H2 database, Apache HertzBeat (incubating) allow you to use MYSQL to store structured relational data such as monitoring information, alarm information and configuration information.   "),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"If you have the MYSQL environment, can be directly to database creation step.  ")),(0,r.yg)("h3",{id:"install-mysql-via-docker"},"Install MYSQL via Docker"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"Download and install the Docker environment",(0,r.yg)("br",{parentName:"li"}),"For Docker installation, please refer to the ",(0,r.yg)("a",{parentName:"li",href:"https://docs.docker.com/get-docker/"},"Docker official documentation"),".\nAfter the installation, please verify in the terminal that the Docker version can be printed normally.",(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre"},"$ docker -v\nDocker version 20.10.12, build e91ed57\n"))),(0,r.yg)("li",{parentName:"ol"},"Install MYSQl with Docker ",(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre"},"$ docker run -d --name mysql \\\n -p 3306:3306 \\\n-v /opt/data:/var/lib/mysql \\\n-e MYSQL_ROOT_PASSWORD=123456 \\\n--restart=always \\\nmysql:5.7\n")),(0,r.yg)("inlineCode",{parentName:"li"},"-v /opt/data:/var/lib/mysql")," is local persistent mount of mysql data directory. ",(0,r.yg)("inlineCode",{parentName:"li"},"/opt/data")," should be replaced with the actual local directory.",(0,r.yg)("br",{parentName:"li"}),"use ",(0,r.yg)("inlineCode",{parentName:"li"},"$ docker ps")," to check if the database started successfully")),(0,r.yg)("h3",{id:"database-creation"},"Database creation"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"Enter MYSQL or use the client to connect MYSQL service",(0,r.yg)("br",{parentName:"li"}),(0,r.yg)("inlineCode",{parentName:"li"},"mysql -uroot -p123456"),"  "),(0,r.yg)("li",{parentName:"ol"},"Create database named hertzbeat",(0,r.yg)("br",{parentName:"li"}),(0,r.yg)("inlineCode",{parentName:"li"},"create database hertzbeat default charset utf8mb4 collate utf8mb4_general_ci;")),(0,r.yg)("li",{parentName:"ol"},"Check if hertzbeat database has been successfully created\n",(0,r.yg)("inlineCode",{parentName:"li"},"show databases;"))),(0,r.yg)("h3",{id:"modify-hertzbeats-configuration-file-applicationyml-and-switch-data-source"},"Modify hertzbeat's configuration file application.yml and switch data source"),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"Configure HertzBeat's configuration file",(0,r.yg)("br",{parentName:"p"}),"\n","Modify ",(0,r.yg)("inlineCode",{parentName:"p"},"hertzbeat/config/application.yml")," configuration file",(0,r.yg)("br",{parentName:"p"}),"\n","Note\u26a0\ufe0fThe docker container way need to mount application.yml file locally, while you can use installation package way to unzip and modify ",(0,r.yg)("inlineCode",{parentName:"p"},"hertzbeat/config/application.yml"),(0,r.yg)("br",{parentName:"p"}),"\n","Replace ",(0,r.yg)("inlineCode",{parentName:"p"},"spring.database")," data source parameters, URL account and password."),(0,r.yg)("p",{parentName:"li"},"For example:"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"spring:\n  datasource:\n    driver-class-name: org.h2.Driver\n    username: sa\n    password: 123456\n    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL\n")),(0,r.yg)("p",{parentName:"li"},"Specific replacement parameters are as follows and you need to configure account according to the mysql environment:   "),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"spring:\n  datasource:\n    driver-class-name: com.mysql.cj.jdbc.Driver\n    username: root\n    password: 123456\n    url: jdbc:mysql://localhost:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&useSSL=false\n    platform: mysql\njpa:\n  database: mysql\n"))),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"It is recommended to set the host field in the MySQL URL or Redis URL to the public IP address when using Hertzbeat in docker.   "))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Start HertzBeat  visit http://ip:1157/ on the browser  You can use HertzBeat monitoring alarm, default account and password are admin/hertzbeat")))}d.isMDXComponent=!0}}]);