"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[81521],{15680:(e,a,t)=>{t.d(a,{xA:()=>m,yg:()=>g});var n=t(96540);function r(e,a,t){return a in e?Object.defineProperty(e,a,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[a]=t,e}function l(e,a){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);a&&(n=n.filter((function(a){return Object.getOwnPropertyDescriptor(e,a).enumerable}))),t.push.apply(t,n)}return t}function o(e){for(var a=1;a<arguments.length;a++){var t=null!=arguments[a]?arguments[a]:{};a%2?l(Object(t),!0).forEach((function(a){r(e,a,t[a])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):l(Object(t)).forEach((function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(t,a))}))}return e}function p(e,a){if(null==e)return{};var t,n,r=function(e,a){if(null==e)return{};var t,n,r={},l=Object.keys(e);for(n=0;n<l.length;n++)t=l[n],a.indexOf(t)>=0||(r[t]=e[t]);return r}(e,a);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(n=0;n<l.length;n++)t=l[n],a.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(r[t]=e[t])}return r}var s=n.createContext({}),i=function(e){var a=n.useContext(s),t=a;return e&&(t="function"==typeof e?e(a):o(o({},a),e)),t},m=function(e){var a=i(e.components);return n.createElement(s.Provider,{value:a},e.children)},c={inlineCode:"code",wrapper:function(e){var a=e.children;return n.createElement(n.Fragment,{},a)}},d=n.forwardRef((function(e,a){var t=e.components,r=e.mdxType,l=e.originalType,s=e.parentName,m=p(e,["components","mdxType","originalType","parentName"]),d=i(t),g=r,y=d["".concat(s,".").concat(g)]||d[g]||c[g]||l;return t?n.createElement(y,o(o({ref:a},m),{},{components:t})):n.createElement(y,o({ref:a},m))}));function g(e,a){var t=arguments,r=a&&a.mdxType;if("string"==typeof e||r){var l=t.length,o=new Array(l);o[0]=d;var p={};for(var s in a)hasOwnProperty.call(a,s)&&(p[s]=a[s]);p.originalType=e,p.mdxType="string"==typeof e?e:r,o[1]=p;for(var i=2;i<l;i++)o[i]=t[i];return n.createElement.apply(null,o)}return n.createElement.apply(null,t)}d.displayName="MDXCreateElement"},94181:(e,a,t)=>{t.r(a),t.d(a,{assets:()=>s,contentTitle:()=>o,default:()=>c,frontMatter:()=>l,metadata:()=>p,toc:()=>i});var n=t(58168),r=(t(96540),t(15680));const l={id:"1.6.0-update",title:"\u5982\u4f55\u5347\u7ea7\u52301.6.0",sidebar_label:"1.6.0\u5347\u7ea7\u6307\u5357"},o=void 0,p={unversionedId:"start/1.6.0-update",id:"version-v1.6.x/start/1.6.0-update",title:"\u5982\u4f55\u5347\u7ea7\u52301.6.0",description:"HertzBeat 1.6.0 \u5347\u7ea7\u6307\u5357",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/start/update-1.6.0.md",sourceDirName:"start",slug:"/start/1.6.0-update",permalink:"/zh-cn/docs/v1.6.x/start/1.6.0-update",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/start/update-1.6.0.md",tags:[],version:"v1.6.x",frontMatter:{id:"1.6.0-update",title:"\u5982\u4f55\u5347\u7ea7\u52301.6.0",sidebar_label:"1.6.0\u5347\u7ea7\u6307\u5357"},sidebar:"docs",previous:{title:"\u57fa\u4e8eRainbond\u90e8\u7f72",permalink:"/zh-cn/docs/v1.6.x/start/rainbond-deploy"},next:{title:"\u7248\u672c\u66f4\u65b0\u6307\u5f15",permalink:"/zh-cn/docs/v1.6.x/start/upgrade"}},s={},i=[{value:"HertzBeat 1.6.0 \u5347\u7ea7\u6307\u5357",id:"hertzbeat-160-\u5347\u7ea7\u6307\u5357",level:2},{value:"\u6ce8\u610f\uff1a\u8be5\u6307\u5357\u9002\u7528\u4e8e1.5.0\u54111.6.0\u7248\u672c\u5347\u7ea7",id:"\u6ce8\u610f\u8be5\u6307\u5357\u9002\u7528\u4e8e150\u5411160\u7248\u672c\u5347\u7ea7",level:3},{value:"\u5982\u679c\u4f60\u4f7f\u7528\u66f4\u8001\u7684\u7248\u672c\uff0c\u5efa\u8bae\u4f7f\u7528\u5bfc\u51fa\u529f\u80fd\u91cd\u65b0\u5b89\u88c5\uff0c\u6216\u5148\u5347\u7ea7\u52301.5.0\u518d\u6309\u672c\u6307\u5357\u5347\u7ea7\u52301.6.0",id:"\u5982\u679c\u4f60\u4f7f\u7528\u66f4\u8001\u7684\u7248\u672c\u5efa\u8bae\u4f7f\u7528\u5bfc\u51fa\u529f\u80fd\u91cd\u65b0\u5b89\u88c5\u6216\u5148\u5347\u7ea7\u5230150\u518d\u6309\u672c\u6307\u5357\u5347\u7ea7\u5230160",level:3},{value:"\u4e8c\u8fdb\u5236\u5b89\u88c5\u5305\u5347\u7ea7",id:"\u4e8c\u8fdb\u5236\u5b89\u88c5\u5305\u5347\u7ea7",level:3},{value:"Docker \u65b9\u5f0f\u5347\u7ea7 - Mysql\u6570\u636e\u5e93",id:"docker-\u65b9\u5f0f\u5347\u7ea7---mysql\u6570\u636e\u5e93",level:3},{value:"Docker\u5b89\u88c5\u5347\u7ea7 - H2\u5185\u7f6e\u6570\u636e\u5e93(\u751f\u4ea7\u73af\u5883\u4e0d\u63a8\u8350\u4f7f\u7528H2)",id:"docker\u5b89\u88c5\u5347\u7ea7---h2\u5185\u7f6e\u6570\u636e\u5e93\u751f\u4ea7\u73af\u5883\u4e0d\u63a8\u8350\u4f7f\u7528h2",level:3},{value:"\u901a\u8fc7\u5bfc\u51fa\u5bfc\u5165\u5347\u7ea7",id:"\u901a\u8fc7\u5bfc\u51fa\u5bfc\u5165\u5347\u7ea7",level:3}],m={toc:i};function c(e){let{components:a,...t}=e;return(0,r.yg)("wrapper",(0,n.A)({},m,t,{components:a,mdxType:"MDXLayout"}),(0,r.yg)("h2",{id:"hertzbeat-160-\u5347\u7ea7\u6307\u5357"},"HertzBeat 1.6.0 \u5347\u7ea7\u6307\u5357"),(0,r.yg)("h3",{id:"\u6ce8\u610f\u8be5\u6307\u5357\u9002\u7528\u4e8e150\u5411160\u7248\u672c\u5347\u7ea7"},"\u6ce8\u610f\uff1a\u8be5\u6307\u5357\u9002\u7528\u4e8e1.5.0\u54111.6.0\u7248\u672c\u5347\u7ea7"),(0,r.yg)("h3",{id:"\u5982\u679c\u4f60\u4f7f\u7528\u66f4\u8001\u7684\u7248\u672c\u5efa\u8bae\u4f7f\u7528\u5bfc\u51fa\u529f\u80fd\u91cd\u65b0\u5b89\u88c5\u6216\u5148\u5347\u7ea7\u5230150\u518d\u6309\u672c\u6307\u5357\u5347\u7ea7\u5230160"},"\u5982\u679c\u4f60\u4f7f\u7528\u66f4\u8001\u7684\u7248\u672c\uff0c\u5efa\u8bae\u4f7f\u7528\u5bfc\u51fa\u529f\u80fd\u91cd\u65b0\u5b89\u88c5\uff0c\u6216\u5148\u5347\u7ea7\u52301.5.0\u518d\u6309\u672c\u6307\u5357\u5347\u7ea7\u52301.6.0"),(0,r.yg)("h3",{id:"\u4e8c\u8fdb\u5236\u5b89\u88c5\u5305\u5347\u7ea7"},"\u4e8c\u8fdb\u5236\u5b89\u88c5\u5305\u5347\u7ea7"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5347\u7ea7Java\u73af\u5883"),(0,r.yg)("p",{parentName:"li"}," \u7531\u4e8e1.6.0\u7248\u672c\u4f7f\u7528Java17\uff0c\u4e14\u5b89\u88c5\u5305\u4e0d\u518d\u63d0\u4f9b\u5185\u7f6ejdk\u7684\u7248\u672c\uff0c\u53c2\u8003\u4ee5\u4e0b\u60c5\u51b5\u4f7f\u7528\u65b0\u7248Hertzbeat\u3002"),(0,r.yg)("ul",{parentName:"li"},(0,r.yg)("li",{parentName:"ul"},"\u5f53\u4f60\u7684\u670d\u52a1\u5668\u4e2d\u9ed8\u8ba4\u73af\u5883\u53d8\u91cf\u4e3aJava17\u65f6\uff0c\u8fd9\u4e00\u6b65\u4f60\u65e0\u9700\u4efb\u4f55\u64cd\u4f5c\u3002"),(0,r.yg)("li",{parentName:"ul"},"\u5f53\u4f60\u7684\u670d\u52a1\u5668\u4e2d\u9ed8\u8ba4\u73af\u5883\u53d8\u91cf\u4e0d\u4e3aJava17\u65f6\uff0c\u5982Java8\u3001Java11\uff0c\u82e5\u4f60\u670d\u52a1\u5668\u4e2d",(0,r.yg)("strong",{parentName:"li"},"\u6ca1\u6709"),"\u5176\u4ed6\u5e94\u7528\u9700\u8981\u4f4e\u7248\u672cJava\uff0c\u6839\u636e\u4f60\u7684\u7cfb\u7edf\uff0c\u5230 ",(0,r.yg)("a",{parentName:"li",href:"https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html"},"https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html")," \u9009\u62e9\u76f8\u5e94\u7684\u53d1\u884c\u7248\u4e0b\u8f7d\uff0c\u5e76\u5728\u641c\u7d22\u5f15\u64ce\u641c\u7d22\u5982\u4f55\u8bbe\u7f6e\u65b0\u7684\u73af\u5883\u53d8\u91cf\u6307\u5411\u65b0\u7684Java17\u3002"),(0,r.yg)("li",{parentName:"ul"},"\u5f53\u4f60\u7684\u670d\u52a1\u5668\u4e2d\u9ed8\u8ba4\u73af\u5883\u53d8\u91cf\u4e0d\u4e3aJava17\u65f6\uff0c\u5982Java8\u3001Java11\uff0c\u82e5\u4f60\u670d\u52a1\u5668\u4e2d",(0,r.yg)("strong",{parentName:"li"},"\u6709"),"\u5176\u4ed6\u5e94\u7528\u9700\u8981\u4f4e\u7248\u672cJava\uff0c\u6839\u636e\u4f60\u7684\u7cfb\u7edf\uff0c\u5230 ",(0,r.yg)("a",{parentName:"li",href:"https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html"},"https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html")," \u9009\u62e9\u76f8\u5e94\u7684\u53d1\u884c\u7248\u4e0b\u8f7d\uff0c\u5e76\u5c06\u89e3\u538b\u540e\u7684\u6587\u4ef6\u5939\u91cd\u547d\u540d\u4e3ajava\uff0c\u590d\u5236\u5230Hertzbeat\u7684\u89e3\u538b\u76ee\u5f55\u4e0b\u3002"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5347\u7ea7\u6570\u636e\u5e93"),(0,r.yg)("p",{parentName:"li"},"\u6253\u5f00",(0,r.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration"},"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration"),"\uff0c\n\u9009\u62e9\u4f60\u4f7f\u7528\u7684\u6570\u636e\u5e93\u7684\u76ee\u5f55\u4e0b\u76f8\u5e94\u7684 ",(0,r.yg)("inlineCode",{parentName:"p"},"V160__update_column.sql"),"\u6587\u4ef6\u6267\u884c\u5347\u7ea7sql\u3002")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5347\u7ea7\u914d\u7f6e\u6587\u4ef6"),(0,r.yg)("p",{parentName:"li"}," \u7531\u4e8e ",(0,r.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u548c ",(0,r.yg)("inlineCode",{parentName:"p"},"sureness.yml"),"\u66f4\u65b0\u53d8\u52a8\u8f83\u5927\uff0c\u5efa\u8bae\u76f4\u63a5\u4f7f\u7528\u65b0\u7684yml\u914d\u7f6e\u6587\u4ef6\uff0c\u7136\u540e\u5728\u81ea\u5df1\u7684\u9700\u6c42\u57fa\u7840\u4e0a\u8fdb\u884c\u4fee\u6539\u3002"),(0,r.yg)("ul",{parentName:"li"},(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u4e00\u822c\u9700\u8981\u4fee\u6539\u4ee5\u4e0b\u90e8\u5206"),(0,r.yg)("p",{parentName:"li"}," \u9ed8\u8ba4\u4e3a\uff1a"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"  datasource:\n    driver-class-name: org.h2.Driver\n    username: sa\n    password: 123456\n    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL\n    hikari:\n      max-lifetime: 120000\n\n  jpa:\n    show-sql: false\n    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform\n    database: h2\n    properties:\n      eclipselink:\n        logging:\n          level: SEVERE\n")),(0,r.yg)("p",{parentName:"li"},"\u5982\u82e5\u4fee\u6539\u4e3amysql\u6570\u636e\u5e93\uff0c\u7ed9\u51fa\u4e00\u4e2a\u793a\u4f8b\uff1a"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"  datasource:\n    driver-class-name: com.mysql.cj.jdbc.Driver\n    username: root\n    password: root\n    url: jdbc:mysql://localhost:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai\n    hikari:\n      max-lifetime: 120000\n\n  jpa:\n    show-sql: false\n    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform\n    database: mysql\n    properties:\n      eclipselink:\n        logging:\n          level: SEVERE\n"))),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("inlineCode",{parentName:"p"},"sureness.yml"),"\u4fee\u6539\u662f\u53ef\u9009\u7684\uff0c\u4e00\u822c\u5728\u4f60\u9700\u8981\u4fee\u6539\u8d26\u53f7\u5bc6\u7801\u65f6"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"# account info config\n# eg: admin has role [admin,user], password is hertzbeat\n# eg: tom has role [user], password is hertzbeat\n# eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289\naccount:\n  - appId: admin\n    credential: hertzbeat\n    role: [admin]\n  - appId: tom\n    credential: hertzbeat\n    role: [user]\n  - appId: guest\n    credential: hertzbeat\n    role: [guest]\n  - appId: lili\n    # credential = MD5(password + salt)\n    # plain password: hertzbeat\n    # attention: digest authentication does not support salted encrypted password accounts\n    credential: 94C6B34E7A199A9F9D4E1F208093B489\n    salt: 123\n    role: [user]\n"))))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u6dfb\u52a0\u76f8\u5e94\u7684\u6570\u636e\u5e93\u9a71\u52a8"))),(0,r.yg)("p",null,"\u7531\u4e8eapache\u57fa\u91d1\u4f1a\u5bf9\u4e8elicense\u5408\u89c4\u7684\u8981\u6c42\uff0cHertzBeat\u7684\u5b89\u88c5\u5305\u4e0d\u80fd\u5305\u542bmysql\uff0coracle\u7b49gpl\u8bb8\u53ef\u7684\u4f9d\u8d56\uff0c\u9700\u8981\u7528\u6237\u81ea\u884c\u6dfb\u52a0\uff0c\u7528\u6237\u53ef\u901a\u8fc7\u4ee5\u4e0b\u94fe\u63a5\u81ea\u884c\u4e0b\u8f7d\u9a71\u52a8\uff0c\u590d\u5236\u5230\u5b89\u88c5\u76ee\u5f55\u4e0b",(0,r.yg)("inlineCode",{parentName:"p"},"ext-lib"),"\u4e2d\u3002"),(0,r.yg)("p",null,"mysql\uff1a",(0,r.yg)("a",{parentName:"p",href:"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.18.zip"},"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip"),(0,r.yg)("br",{parentName:"p"}),"\n","oracle\uff08\u5982\u679c\u4f60\u8981\u76d1\u63a7oracle\uff0c\u8fd9\u4e24\u4e2a\u9a71\u52a8\u662f\u5fc5\u987b\u7684\uff09\uff1a",(0,r.yg)("br",{parentName:"p"}),"\n","",(0,r.yg)("a",{parentName:"p",href:"https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar"},"https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar"),(0,r.yg)("br",{parentName:"p"}),"\n","",(0,r.yg)("a",{parentName:"p",href:"https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar?utm_source=mavenlibs.com"},"https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar"),(0,r.yg)("br",{parentName:"p"}),"\n","\u63a5\u4e0b\u6765\uff0c\u50cf\u4e4b\u524d\u90a3\u6837\u8fd0\u884c\u542f\u52a8\u811a\u672c\uff0c\u5373\u53ef\u4f53\u9a8c\u6700\u65b0\u7684HertzBeat1.6.0\uff01"),(0,r.yg)("h3",{id:"docker-\u65b9\u5f0f\u5347\u7ea7---mysql\u6570\u636e\u5e93"},"Docker \u65b9\u5f0f\u5347\u7ea7 - Mysql\u6570\u636e\u5e93"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5173\u95ed HertzBeat \u5bb9\u5668"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"docker stop hertzbeat\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5347\u7ea7\u6570\u636e\u5e93\u811a\u672c"),(0,r.yg)("p",{parentName:"li"},"\u6253\u5f00",(0,r.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration"},"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration"),"\uff0c\n\u9009\u62e9\u4f60\u4f7f\u7528\u7684\u6570\u636e\u5e93\u7684\u76ee\u5f55\u4e0b\u76f8\u5e94\u7684 ",(0,r.yg)("inlineCode",{parentName:"p"},"V160__update_column.sql"),"\u6587\u4ef6\u5728 Mysql \u6267\u884c\u5347\u7ea7sql\u3002")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5347\u7ea7\u914d\u7f6e\u6587\u4ef6"),(0,r.yg)("p",{parentName:"li"}," \u7531\u4e8e ",(0,r.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u548c ",(0,r.yg)("inlineCode",{parentName:"p"},"sureness.yml"),"\u66f4\u65b0\u53d8\u52a8\u8f83\u5927\uff0c\u5efa\u8bae\u76f4\u63a5\u6302\u8f7d\u4f7f\u7528\u65b0\u7684yml\u914d\u7f6e\u6587\u4ef6\uff0c\u7136\u540e\u5728\u81ea\u5df1\u7684\u9700\u6c42\u57fa\u7840\u4e0a\u8fdb\u884c\u4fee\u6539\u3002"),(0,r.yg)("ul",{parentName:"li"},(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u4e00\u822c\u9700\u8981\u4fee\u6539\u4ee5\u4e0b\u90e8\u5206"),(0,r.yg)("p",{parentName:"li"}," \u9ed8\u8ba4\u4e3a\uff1a"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"  datasource:\n    driver-class-name: com.mysql.cj.jdbc.Driver\n    username: root\n    password: root\n    url: jdbc:mysql://localhost:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai\n    hikari:\n      max-lifetime: 120000\n\n  jpa:\n    show-sql: false\n    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform\n    database: mysql\n    properties:\n      eclipselink:\n        logging:\n          level: SEVERE\n"))),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("inlineCode",{parentName:"p"},"sureness.yml"),"\u4fee\u6539\u662f\u53ef\u9009\u7684\uff0c\u4e00\u822c\u5728\u4f60\u9700\u8981\u4fee\u6539\u8d26\u53f7\u5bc6\u7801\u65f6"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"# account info config\n# eg: admin has role [admin,user], password is hertzbeat\n# eg: tom has role [user], password is hertzbeat\n# eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289\naccount:\n  - appId: admin\n    credential: hertzbeat\n    role: [admin]\n  - appId: tom\n    credential: hertzbeat\n    role: [user]\n  - appId: guest\n    credential: hertzbeat\n    role: [guest]\n  - appId: lili\n    # credential = MD5(password + salt)\n    # plain password: hertzbeat\n    # attention: digest authentication does not support salted encrypted password accounts\n    credential: 94C6B34E7A199A9F9D4E1F208093B489\n    salt: 123\n    role: [user]\n"))))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u6dfb\u52a0\u76f8\u5e94\u7684\u6570\u636e\u5e93\u9a71\u52a8"))),(0,r.yg)("p",null,"\u7531\u4e8eapache\u57fa\u91d1\u4f1a\u5bf9\u4e8elicense\u5408\u89c4\u7684\u8981\u6c42\uff0cHertzBeat\u7684\u5b89\u88c5\u5305\u4e0d\u80fd\u5305\u542bmysql\uff0coracle\u7b49gpl\u8bb8\u53ef\u7684\u4f9d\u8d56\uff0c\u9700\u8981\u7528\u6237\u81ea\u884c\u6dfb\u52a0\uff0c\u7528\u6237\u53ef\u901a\u8fc7\u4ee5\u4e0b\u94fe\u63a5\u81ea\u884c\u4e0b\u8f7d\u9a71\u52a8 jar \u653e\u5230\u672c\u5730 ",(0,r.yg)("inlineCode",{parentName:"p"},"ext-lib"),"\u76ee\u5f55\u4e0b\uff0c\u7136\u540e\u542f\u52a8\u65f6\u5c06",(0,r.yg)("inlineCode",{parentName:"p"},"ext-lib"),"\u6302\u8f7d\u5230\u5bb9\u5668\u7684 ",(0,r.yg)("inlineCode",{parentName:"p"},"/opt/hertzbeat/ext-lib"),"\u76ee\u5f55\u3002"),(0,r.yg)("p",null,"mysql\uff1a",(0,r.yg)("a",{parentName:"p",href:"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.18.zip"},"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip"),(0,r.yg)("br",{parentName:"p"}),"\n","oracle\uff08\u5982\u679c\u4f60\u8981\u76d1\u63a7oracle\uff0c\u8fd9\u4e24\u4e2a\u9a71\u52a8\u662f\u5fc5\u987b\u7684\uff09\uff1a",(0,r.yg)("br",{parentName:"p"}),"\n","",(0,r.yg)("a",{parentName:"p",href:"https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar"},"https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar"),(0,r.yg)("br",{parentName:"p"}),"\n","",(0,r.yg)("a",{parentName:"p",href:"https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar?utm_source=mavenlibs.com"},"https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar"),(0,r.yg)("br",{parentName:"p"}),"\n","\u63a5\u4e0b\u6765\uff0c\u50cf\u4e4b\u524d\u90a3\u6837 Docker \u8fd0\u884c\u542f\u52a8 HertzBeat\uff0c\u5373\u53ef\u4f53\u9a8c\u6700\u65b0\u7684HertzBeat1.6.0\uff01"),(0,r.yg)("h3",{id:"docker\u5b89\u88c5\u5347\u7ea7---h2\u5185\u7f6e\u6570\u636e\u5e93\u751f\u4ea7\u73af\u5883\u4e0d\u63a8\u8350\u4f7f\u7528h2"},"Docker\u5b89\u88c5\u5347\u7ea7 - H2\u5185\u7f6e\u6570\u636e\u5e93(\u751f\u4ea7\u73af\u5883\u4e0d\u63a8\u8350\u4f7f\u7528H2)"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5173\u95ed HertzBeat \u5bb9\u5668"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"docker stop hertzbeat\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u7f16\u8f91H2\u6570\u636e\u5e93\u6587\u4ef6"),(0,r.yg)("p",{parentName:"li"},"\u524d\u9898\u4f60\u5df2\u7ecf\u5c06 H2 \u6570\u636e\u5e93\u6587\u4ef6 data \u76ee\u5f55\u6302\u8f7d\u5230\u672c\u5730\uff0c\u6216\u8005\u542f\u52a8\u8001\u5bb9\u5668\u624b\u52a8\u5c06 /opt/hertzbeat/data \u76ee\u5f55\u62f7\u8d1d\u51fa\u6765\u3002\n\u4e0b\u8f7d h2 \u9a71\u52a8 jar ",(0,r.yg)("a",{parentName:"p",href:"https://mvnrepository.com/artifact/com.h2database/h2/2.2.220"},"https://mvnrepository.com/artifact/com.h2database/h2/2.2.220"),"\n\u4f7f\u7528 h2 \u9a71\u52a8 jar \u672c\u5730\u542f\u52a8\u6570\u636e\u5e93"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"java -jar h2-2.2.220.jar -url jdbc:h2:file:./hertzbeat -user sa -password 123456\n")),(0,r.yg)("p",{parentName:"li"}," \u6253\u5f00",(0,r.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration"},"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager/src/main/resources/db/migration"),"\uff0c\n\u9009\u62e9\u4f60\u4f7f\u7528\u7684\u6570\u636e\u5e93\u7684\u76ee\u5f55\u4e0b\u76f8\u5e94\u7684 ",(0,r.yg)("inlineCode",{parentName:"p"},"V160__update_column.sql"),"\u6587\u4ef6\u5728 H2 \u6267\u884c\u5347\u7ea7sql\u3002")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u5347\u7ea7\u914d\u7f6e\u6587\u4ef6"),(0,r.yg)("p",{parentName:"li"}," \u7531\u4e8e ",(0,r.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u548c ",(0,r.yg)("inlineCode",{parentName:"p"},"sureness.yml"),"\u66f4\u65b0\u53d8\u52a8\u8f83\u5927\uff0c\u5efa\u8bae\u76f4\u63a5\u6302\u8f7d\u4f7f\u7528\u65b0\u7684yml\u914d\u7f6e\u6587\u4ef6\uff0c\u7136\u540e\u5728\u81ea\u5df1\u7684\u9700\u6c42\u57fa\u7840\u4e0a\u8fdb\u884c\u4fee\u6539\u3002"),(0,r.yg)("ul",{parentName:"li"},(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u4e00\u822c\u9700\u8981\u4fee\u6539\u4ee5\u4e0b\u90e8\u5206"),(0,r.yg)("p",{parentName:"li"}," \u9ed8\u8ba4\u4e3a\uff1a"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"  datasource:\n    driver-class-name: org.h2.Driver\n    username: sa\n    password: 123456\n    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL\n    hikari:\n      max-lifetime: 120000\n\n  jpa:\n    show-sql: false\n    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform\n    database: h2\n    properties:\n      eclipselink:\n        logging:\n          level: SEVERE\n"))),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},(0,r.yg)("inlineCode",{parentName:"p"},"sureness.yml"),"\u4fee\u6539\u662f\u53ef\u9009\u7684\uff0c\u4e00\u822c\u5728\u4f60\u9700\u8981\u4fee\u6539\u8d26\u53f7\u5bc6\u7801\u65f6"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"# account info config\n# eg: admin has role [admin,user], password is hertzbeat\n# eg: tom has role [user], password is hertzbeat\n# eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289\naccount:\n  - appId: admin\n    credential: hertzbeat\n    role: [admin]\n  - appId: tom\n    credential: hertzbeat\n    role: [user]\n  - appId: guest\n    credential: hertzbeat\n    role: [guest]\n  - appId: lili\n    # credential = MD5(password + salt)\n    # plain password: hertzbeat\n    # attention: digest authentication does not support salted encrypted password accounts\n    credential: 94C6B34E7A199A9F9D4E1F208093B489\n    salt: 123\n    role: [user]\n"))))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"\u6dfb\u52a0\u76f8\u5e94\u7684\u6570\u636e\u5e93\u9a71\u52a8"))),(0,r.yg)("p",null,"\u7531\u4e8eapache\u57fa\u91d1\u4f1a\u5bf9\u4e8elicense\u5408\u89c4\u7684\u8981\u6c42\uff0cHertzBeat\u7684\u5b89\u88c5\u5305\u4e0d\u80fd\u5305\u542bmysql\uff0coracle\u7b49gpl\u8bb8\u53ef\u7684\u4f9d\u8d56\uff0c\u9700\u8981\u7528\u6237\u81ea\u884c\u6dfb\u52a0\uff0c\u7528\u6237\u53ef\u901a\u8fc7\u4ee5\u4e0b\u94fe\u63a5\u81ea\u884c\u4e0b\u8f7d\u9a71\u52a8 jar \u653e\u5230\u672c\u5730 ",(0,r.yg)("inlineCode",{parentName:"p"},"ext-lib"),"\u76ee\u5f55\u4e0b\uff0c\u7136\u540e\u542f\u52a8\u65f6\u5c06",(0,r.yg)("inlineCode",{parentName:"p"},"ext-lib"),"\u6302\u8f7d\u5230\u5bb9\u5668\u7684 ",(0,r.yg)("inlineCode",{parentName:"p"},"/opt/hertzbeat/ext-lib"),"\u76ee\u5f55\u3002"),(0,r.yg)("p",null,"mysql\uff1a",(0,r.yg)("a",{parentName:"p",href:"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.18.zip"},"https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip"),(0,r.yg)("br",{parentName:"p"}),"\n","oracle\uff08\u5982\u679c\u4f60\u8981\u76d1\u63a7oracle\uff0c\u8fd9\u4e24\u4e2a\u9a71\u52a8\u662f\u5fc5\u987b\u7684\uff09\uff1a",(0,r.yg)("br",{parentName:"p"}),"\n","",(0,r.yg)("a",{parentName:"p",href:"https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar"},"https://download.oracle.com/otn-pub/otn_software/jdbc/234/ojdbc8.jar"),(0,r.yg)("br",{parentName:"p"}),"\n","",(0,r.yg)("a",{parentName:"p",href:"https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar?utm_source=mavenlibs.com"},"https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar"),(0,r.yg)("br",{parentName:"p"}),"\n","\u63a5\u4e0b\u6765\uff0c\u50cf\u4e4b\u524d\u90a3\u6837 Docker \u8fd0\u884c\u542f\u52a8\uff0c\u5373\u53ef\u4f53\u9a8c\u6700\u65b0\u7684HertzBeat1.6.0\uff01"),(0,r.yg)("h3",{id:"\u901a\u8fc7\u5bfc\u51fa\u5bfc\u5165\u5347\u7ea7"},"\u901a\u8fc7\u5bfc\u51fa\u5bfc\u5165\u5347\u7ea7"),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"\u82e5\u4e0d\u60f3\u5982\u4e0a\u7e41\u7410\u7684\u811a\u672c\u5347\u7ea7\u65b9\u5f0f\uff0c\u53ef\u4ee5\u76f4\u63a5\u5c06\u8001\u73af\u5883\u7684\u76d1\u63a7\u4efb\u52a1\u548c\u9608\u503c\u4fe1\u606f\u5bfc\u51fa\u5bfc\u5165")),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"\u90e8\u7f72\u4e00\u5957\u6700\u65b0\u7248\u672c\u7684\u65b0\u73af\u5883"),(0,r.yg)("li",{parentName:"ol"},"\u5728\u9875\u9762\u4e0a\u5c06\u8001\u73af\u5883\u7684\u76d1\u63a7\u4efb\u52a1\u548c\u9608\u503c\u4fe1\u606f\u5bfc\u51fa\u3002"),(0,r.yg)("li",{parentName:"ol"},"\u5728\u9875\u9762\u4e0a\u5c06\u76d1\u63a7\u4efb\u52a1\u548c\u9608\u503c\u4fe1\u606f\u6587\u4ef6\u5bfc\u5165\u3002")),(0,r.yg)("p",null,"\u26a0\ufe0f\u6ce8\u610f\u6b64\u65b9\u5f0f\u53ea\u4fdd\u7559\u4e86\u8001\u73af\u5883\u7684\u76d1\u63a7\u4efb\u52a1\u4fe1\u606f\u548c\u9608\u503c\u4fe1\u606f\uff0c\u6ca1\u6709\u5176\u5b83\u6570\u636e\u3002"))}c.isMDXComponent=!0}}]);