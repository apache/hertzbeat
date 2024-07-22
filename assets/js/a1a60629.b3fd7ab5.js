"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[22653],{15680:(e,t,a)=>{a.d(t,{xA:()=>s,yg:()=>m});var n=a(96540);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function o(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?o(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):o(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function l(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},o=Object.keys(e);for(n=0;n<o.length;n++)a=o[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)a=o[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var p=n.createContext({}),c=function(e){var t=n.useContext(p),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},s=function(e){var t=c(e.components);return n.createElement(p.Provider,{value:t},e.children)},g={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,o=e.originalType,p=e.parentName,s=l(e,["components","mdxType","originalType","parentName"]),d=c(a),m=r,y=d["".concat(p,".").concat(m)]||d[m]||g[m]||o;return a?n.createElement(y,i(i({ref:t},s),{},{components:a})):n.createElement(y,i({ref:t},s))}));function m(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var o=a.length,i=new Array(o);i[0]=d;var l={};for(var p in t)hasOwnProperty.call(t,p)&&(l[p]=t[p]);l.originalType=e,l.mdxType="string"==typeof e?e:r,i[1]=l;for(var c=2;c<o;c++)i[c]=a[c];return n.createElement.apply(null,i)}return n.createElement.apply(null,a)}d.displayName="MDXCreateElement"},97972:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>p,contentTitle:()=>i,default:()=>g,frontMatter:()=>o,metadata:()=>l,toc:()=>c});var n=a(58168),r=(a(96540),a(15680));const o={id:"package-deploy",title:"Install HertzBeat via Package",sidebar_label:"Install via Package"},i=void 0,l={unversionedId:"start/package-deploy",id:"start/package-deploy",title:"Install HertzBeat via Package",description:"You can install and run Apache HertzBeat (incubating) on Linux Windows Mac system, and CPU supports X86/ARM64.",source:"@site/docs/start/package-deploy.md",sourceDirName:"start",slug:"/start/package-deploy",permalink:"/docs/start/package-deploy",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/start/package-deploy.md",tags:[],version:"current",frontMatter:{id:"package-deploy",title:"Install HertzBeat via Package",sidebar_label:"Install via Package"},sidebar:"docs",previous:{title:"Install via Docker Compose",permalink:"/docs/start/docker-compose-deploy"},next:{title:"Update to 1.6.0 guide",permalink:"/docs/start/1.6.0-update"}},p={},c=[{value:"Deploy HertzBeat Server",id:"deploy-hertzbeat-server",level:3},{value:"Deploy HertzBeat Collector Cluster(Optional)",id:"deploy-hertzbeat-collector-clusteroptional",level:3},{value:"FAQ",id:"faq",level:3}],s={toc:c};function g(e){let{components:t,...o}=e;return(0,r.yg)("wrapper",(0,n.A)({},s,o,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("admonition",{type:"tip"},(0,r.yg)("p",{parentName:"admonition"},"You can install and run Apache HertzBeat (incubating) on Linux Windows Mac system, and CPU supports X86/ARM64.",(0,r.yg)("br",{parentName:"p"}),"\n","Deployment via package relies on Java runtime environment, ensure you have Java17 environment installed, if not please refer to ",(0,r.yg)("a",{parentName:"p",href:"http://www.oracle.com/technetwork/java/javase/downloads/index.html"},"official website"))),(0,r.yg)("h3",{id:"deploy-hertzbeat-server"},"Deploy HertzBeat Server"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Download installation package"),(0,r.yg)("p",{parentName:"li"},"Download installation package ",(0,r.yg)("inlineCode",{parentName:"p"},"apache-hertzbeat-xxx-incubating-bin.tar.gz")," corresponding to your system environment"),(0,r.yg)("ul",{parentName:"li"},(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("a",{parentName:"li",href:"/docs/download"},"Download Page")))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Configure HertzBeat's configuration file(optional)"),(0,r.yg)("p",{parentName:"li"},"Unzip the installation package to the host eg: /opt/hertzbeat"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre"},"$ tar zxvf apache-hertzbeat-xxx-incubating-bin.tar.gz\n")))),(0,r.yg)("admonition",{type:"tip"},(0,r.yg)("p",{parentName:"admonition"},"The configuration file is located in ",(0,r.yg)("inlineCode",{parentName:"p"},"config/application.yml"),", you can modify the configuration file according to your needs to configure external dependent services, such as databases, time series databases, etc.",(0,r.yg)("br",{parentName:"p"}),"\n","HertzBeat defaults to using internal services when started, but it is recommended to switch to external database services in production environments.")),(0,r.yg)("p",null,"It is recommended to use ",(0,r.yg)("a",{parentName:"p",href:"postgresql-change"},"PostgreSQL")," for metadata storage and ",(0,r.yg)("a",{parentName:"p",href:"victoria-metrics-init"},"VictoriaMetrics")," for metric data storage. Specific steps are as follows"),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("a",{parentName:"li",href:"postgresql-change"},"Switch built-in H2 database to PostgreSQL")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("a",{parentName:"li",href:"victoria-metrics-init"},"Using VictoriaMetrics to store metric data"))),(0,r.yg)("ol",{start:3},(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Configure the account file(optional)"),(0,r.yg)("p",{parentName:"li"},"HertzBeat default built-in three user accounts, respectively ",(0,r.yg)("inlineCode",{parentName:"p"},"admin/hertzbeat tom/hertzbeat guest/hertzbeat"),(0,r.yg)("br",{parentName:"p"}),"\n","If you need modify account or password, configure ",(0,r.yg)("inlineCode",{parentName:"p"},"config/sureness.yml"),".",(0,r.yg)("br",{parentName:"p"}),"\n","For detail steps, please refer to ",(0,r.yg)("a",{parentName:"p",href:"account-modify"},"Configure Account Password"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Start the service"),(0,r.yg)("p",{parentName:"li"},"Execute the startup script in the installation directory ",(0,r.yg)("inlineCode",{parentName:"p"},"bin/"),", or ",(0,r.yg)("inlineCode",{parentName:"p"},"startup.bat")," in windows."),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre"},"$ ./startup.sh \n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Begin to explore HertzBeat"),(0,r.yg)("p",{parentName:"li"},"Access http://ip:1157/ using browser. You can explore HertzBeat with default account ",(0,r.yg)("inlineCode",{parentName:"p"},"admin/hertzbeat")," now!"))),(0,r.yg)("h3",{id:"deploy-hertzbeat-collector-clusteroptional"},"Deploy HertzBeat Collector Cluster(Optional)"),(0,r.yg)("admonition",{type:"note"},(0,r.yg)("p",{parentName:"admonition"},"HertzBeat Collector is a lightweight data collector used to collect and send data to HertzBeat Server.",(0,r.yg)("br",{parentName:"p"}),"\n","Deploying multiple HertzBeat Collectors can achieve high availability, load balancing, and cloud-edge collaboration of data.")),(0,r.yg)("p",null,(0,r.yg)("img",{alt:"hertzbeat",src:a(99675).A,width:"2360",height:"846"})),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Download installation package"),(0,r.yg)("p",{parentName:"li"},"Download installation package ",(0,r.yg)("inlineCode",{parentName:"p"},"apache-hertzbeat-collector-xxx-incubating-bin.tar.gz")," corresponding to your system environment"),(0,r.yg)("ul",{parentName:"li"},(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("a",{parentName:"li",href:"/docs/download"},"Download Page")))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Configure the collector configuration file"))),(0,r.yg)("p",null,"Unzip the installation package to the host eg: /opt/hertzbeat-collector"),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre"},"$ tar zxvf apache-hertzbeat-collector-xxx-incubating-bin.tar.gz\n")),(0,r.yg)("p",null,"Configure the collector configuration yml file ",(0,r.yg)("inlineCode",{parentName:"p"},"config/application.yml"),": unique ",(0,r.yg)("inlineCode",{parentName:"p"},"identity")," name, running ",(0,r.yg)("inlineCode",{parentName:"p"},"mode")," (public or private), hertzbeat ",(0,r.yg)("inlineCode",{parentName:"p"},"manager-host"),", hertzbeat ",(0,r.yg)("inlineCode",{parentName:"p"},"manager-port")),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"     collector:\n       dispatch:\n         entrance:\n           netty:\n             enabled: true\n             identity: ${IDENTITY:}\n             mode: ${MODE:public}\n             manager-host: ${MANAGER_HOST:127.0.0.1}\n             manager-port: ${MANAGER_PORT:1158}\n")),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Parameters detailed explanation")),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("inlineCode",{parentName:"li"},"identity")," : (optional) Set the unique identifier name of the collector. Note that the name of the collector must be unique when there are multiple collectors."),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("inlineCode",{parentName:"li"},"mode")," : Configure the running mode (public or private), public cluster mode or private cloud-edge mode."),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("inlineCode",{parentName:"li"},"manager-host")," : Important, configure the address of the connected HertzBeat Server,"),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("inlineCode",{parentName:"li"},"manager-port")," : (optional) Configure the port of the connected HertzBeat Server, default 1158.")),(0,r.yg)("ol",{start:3},(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Start the service"),(0,r.yg)("p",{parentName:"li"},"Run command ",(0,r.yg)("inlineCode",{parentName:"p"},"$ ./bin/startup.sh ")," or ",(0,r.yg)("inlineCode",{parentName:"p"},"bin/startup.bat"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Begin to explore HertzBeat Collector    "),(0,r.yg)("p",{parentName:"li"},"Access ",(0,r.yg)("inlineCode",{parentName:"p"},"http://ip:1157")," and you will see the registered new collector in dashboard"))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"HAVE FUN")),(0,r.yg)("hr",null),(0,r.yg)("h3",{id:"faq"},"FAQ"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"you need to prepare the JAVA environment in advance"),(0,r.yg)("p",{parentName:"li"},"Install JAVA runtime environment-refer to ",(0,r.yg)("a",{parentName:"p",href:"http://www.oracle.com/technetwork/java/javase/downloads/index.html"},"official website"),(0,r.yg)("br",{parentName:"p"}),"\n","requirement\uff1aJDK17 ENV",(0,r.yg)("br",{parentName:"p"}),"\n","download JAVA installation package: ",(0,r.yg)("a",{parentName:"p",href:"https://repo.huaweicloud.com/java/jdk/"},"mirror website"),(0,r.yg)("br",{parentName:"p"}),"\n","After installation use command line to check whether you install it successfully."),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre"},'$ java -version\njava version "17.0.9"\nJava(TM) SE Runtime Environment 17.0.9 (build 17.0.9+8-LTS-237)\nJava HotSpot(TM) 64-Bit Server VM 17.0.9 (build 17.0.9+8-LTS-237, mixed mode)\n\n'))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"According to the process deploy\uff0cvisit http://ip:1157/ no interface",(0,r.yg)("br",{parentName:"p"}),"\n","Please refer to the following points to troubleshoot issues:"),(0,r.yg)("blockquote",{parentName:"li"},(0,r.yg)("p",{parentName:"blockquote"},"1\uff1aIf you switch to dependency service MYSQL database\uff0ccheck whether the database is created and started successfully.\n2\uff1aCheck whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file ",(0,r.yg)("inlineCode",{parentName:"p"},"hertzbeat/config/application.yml"),".",(0,r.yg)("br",{parentName:"p"}),"\n","3\uff1aCheck whether the running log has errors in ",(0,r.yg)("inlineCode",{parentName:"p"},"hertzbeat/logs/")," directory. If you haven't solved the issue, report it to the communication group or community.")))))}g.isMDXComponent=!0},99675:(e,t,a)=>{a.d(t,{A:()=>n});const n=a.p+"assets/images/cluster-arch-f5cb9fea50e3ce406fb7b97d2c0add56.png"}}]);