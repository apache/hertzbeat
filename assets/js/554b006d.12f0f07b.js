"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[26809],{15680:(e,a,t)=>{t.d(a,{xA:()=>p,yg:()=>u});var n=t(96540);function r(e,a,t){return a in e?Object.defineProperty(e,a,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[a]=t,e}function o(e,a){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);a&&(n=n.filter((function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable}))),t.push.apply(t,n)}return t}function l(e){for(var a=1;a<arguments.length;a++){var t=null!=arguments[a]?arguments[a]:{};a%2?o(Object(t),!0).forEach((function(a){r(e,a,t[a])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(t,a))}))}return e}function i(e,a){if(null==e)return{};var t,n,r=function(e,a){if(null==e)return{};var t,n,r={},o=Object.keys(e);for(n=0;n<o.length;n++)t=o[n],a.indexOf(t)>=0||(r[t]=e[t]);return r}(e,a);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)t=o[n],a.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(r[t]=e[t])}return r}var s=n.createContext({}),c=function(e){var a=n.useContext(s),t=a;return e&&(t="function"==typeof e?e(a):l(l({},a),e)),t},p=function(e){var a=c(e.components);return n.createElement(s.Provider,{value:a},e.children)},d={inlineCode:"code",wrapper:function(e){var a=e.children;return n.createElement(n.Fragment,{},a)}},m=n.forwardRef((function(e,a){var t=e.components,r=e.mdxType,o=e.originalType,s=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),m=c(t),u=r,y=m["".concat(s,".").concat(u)]||m[u]||d[u]||o;return t?n.createElement(y,l(l({ref:a},p),{},{components:t})):n.createElement(y,l({ref:a},p))}));function u(e,a){var t=arguments,r=a&&a.mdxType;if("string"==typeof e||r){var o=t.length,l=new Array(o);l[0]=m;var i={};for(var s in a)hasOwnProperty.call(a,s)&&(i[s]=a[s]);i.originalType=e,i.mdxType="string"==typeof e?e:r,l[1]=i;for(var c=2;c<o;c++)l[c]=t[c];return n.createElement.apply(null,l)}return n.createElement.apply(null,t)}m.displayName="MDXCreateElement"},53217:(e,a,t)=>{t.r(a),t.d(a,{assets:()=>s,contentTitle:()=>l,default:()=>d,frontMatter:()=>o,metadata:()=>i,toc:()=>c});var n=t(58168),r=(t(96540),t(15680));const o={id:"mysql-change",title:"Use MYSQL Replace H2 Database to Store Metadata(Optional)",sidebar_label:"Meta Store MYSQL"},l=void 0,i={unversionedId:"start/mysql-change",id:"start/mysql-change",title:"Use MYSQL Replace H2 Database to Store Metadata(Optional)",description:"MYSQL is a reliable relational database. In addition to default built-in H2 database, Apache HertzBeat (incubating) allow you to use MYSQL to store structured relational data such as monitoring information, alarm information and configuration information.",source:"@site/docs/start/mysql-change.md",sourceDirName:"start",slug:"/start/mysql-change",permalink:"/docs/start/mysql-change",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/start/mysql-change.md",tags:[],version:"current",frontMatter:{id:"mysql-change",title:"Use MYSQL Replace H2 Database to Store Metadata(Optional)",sidebar_label:"Meta Store MYSQL"},sidebar:"docs",previous:{title:"Meta Store PostgreSQL (Recommended)",permalink:"/docs/start/postgresql-change"},next:{title:"SSL Certificate Monitor Practice",permalink:"/docs/start/ssl-cert-practice"}},s={},c=[{value:"Install MYSQL via Docker",id:"install-mysql-via-docker",level:3},{value:"Database creation",id:"database-creation",level:3},{value:"Add MYSQL jdbc driver jar",id:"add-mysql-jdbc-driver-jar",level:3},{value:"Modify hertzbeat&#39;s configuration file application.yml and switch data source",id:"modify-hertzbeats-configuration-file-applicationyml-and-switch-data-source",level:3}],p={toc:c};function d(e){let{components:a,...t}=e;return(0,r.yg)("wrapper",(0,n.A)({},p,t,{components:a,mdxType:"MDXLayout"}),(0,r.yg)("p",null,"MYSQL is a reliable relational database. In addition to default built-in H2 database, Apache HertzBeat (incubating) allow you to use MYSQL to store structured relational data such as monitoring information, alarm information and configuration information."),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"If you have the MYSQL environment, can be directly to database creation step.")),(0,r.yg)("h3",{id:"install-mysql-via-docker"},"Install MYSQL via Docker"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Download and install the Docker environment\nFor Docker installation, please refer to the ",(0,r.yg)("a",{parentName:"p",href:"https://docs.docker.com/get-docker/"},"Docker official documentation"),".\nAfter the installation, please verify in the terminal that the Docker version can be printed normally."),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"$ docker -v\nDocker version 20.10.12, build e91ed57\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Install MYSQl with Docker"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"$ docker run -d --name mysql \\\n -p 3306:3306 \\\n-v /opt/data:/var/lib/mysql \\\n-e MYSQL_ROOT_PASSWORD=123456 \\\n--restart=always \\\nmysql:5.7\n")),(0,r.yg)("p",{parentName:"li"},(0,r.yg)("inlineCode",{parentName:"p"},"-v /opt/data:/var/lib/mysql")," is local persistent mount of mysql data directory. ",(0,r.yg)("inlineCode",{parentName:"p"},"/opt/data")," should be replaced with the actual local directory.\nuse ",(0,r.yg)("inlineCode",{parentName:"p"},"$ docker ps")," to check if the database started successfully"))),(0,r.yg)("h3",{id:"database-creation"},"Database creation"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"Enter MYSQL or use the client to connect MYSQL service\n",(0,r.yg)("inlineCode",{parentName:"li"},"mysql -uroot -p123456")),(0,r.yg)("li",{parentName:"ol"},"Create database named hertzbeat\n",(0,r.yg)("inlineCode",{parentName:"li"},"create database hertzbeat default charset utf8mb4 collate utf8mb4_general_ci;")),(0,r.yg)("li",{parentName:"ol"},"Check if hertzbeat database has been successfully created\n",(0,r.yg)("inlineCode",{parentName:"li"},"show databases;"))),(0,r.yg)("h3",{id:"add-mysql-jdbc-driver-jar"},"Add MYSQL jdbc driver jar"),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},"Download the MYSQL jdbc driver jar package, such as mysql-connector-java-8.0.25.jar. ",(0,r.yg)("a",{parentName:"li",href:"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip"},"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip")),(0,r.yg)("li",{parentName:"ul"},"Copy the jar package to the ",(0,r.yg)("inlineCode",{parentName:"li"},"hertzbeat/ext-lib")," directory.")),(0,r.yg)("h3",{id:"modify-hertzbeats-configuration-file-applicationyml-and-switch-data-source"},"Modify hertzbeat's configuration file application.yml and switch data source"),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"Configure HertzBeat's configuration file",(0,r.yg)("br",{parentName:"p"}),"\n","Modify ",(0,r.yg)("inlineCode",{parentName:"p"},"hertzbeat/config/application.yml")," configuration file",(0,r.yg)("br",{parentName:"p"}),"\n","Note\u26a0\ufe0fThe docker container way need to mount application.yml file locally, while you can use installation package way to unzip and modify ",(0,r.yg)("inlineCode",{parentName:"p"},"hertzbeat/config/application.yml"),(0,r.yg)("br",{parentName:"p"}),"\n","Replace ",(0,r.yg)("inlineCode",{parentName:"p"},"spring.database")," data source parameters, URL account and password."),(0,r.yg)("p",{parentName:"li"},"For example:"))),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"spring:\n  datasource:\n    driver-class-name: org.h2.Driver\n    username: sa\n    password: 123456\n    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL\n    hikari:\n      max-lifetime: 120000\n\n  jpa:\n    show-sql: false\n    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform\n    database: h2\n    properties:\n      eclipselink:\n        logging:\n          level: SEVERE\n")),(0,r.yg)("p",null,"Specific replacement parameters are as follows and you need to configure account according to the mysql environment:"),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"spring:\n  datasource:\n    driver-class-name: com.mysql.cj.jdbc.Driver\n    username: root\n    password: 123456\n    url: jdbc:mysql://mysql:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&allowPublicKeyRetrieval=true&useSSL=false\n    hikari:\n      max-lifetime: 120000\n  jpa:\n    show-sql: false\n    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform\n    database: mysql\n    properties:\n      eclipselink:\n        logging:\n          level: SEVERE\n")),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},"It is recommended to set the host field in the MySQL URL to the public IP address when using Hertzbeat in docker.")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Start HertzBeat  visit ",(0,r.yg)("a",{parentName:"strong",href:"http://ip:1157/"},"http://ip:1157/")," on the browser  You can use HertzBeat monitoring alarm, default account and password are admin/hertzbeat")))}d.isMDXComponent=!0}}]);