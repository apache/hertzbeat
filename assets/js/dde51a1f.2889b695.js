"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[15398],{15680:(e,t,n)=>{n.d(t,{xA:()=>s,yg:()=>u});var a=n(96540);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},l=Object.keys(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(a=0;a<l.length;a++)n=l[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var g=a.createContext({}),p=function(e){var t=a.useContext(g),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},s=function(e){var t=p(e.components);return a.createElement(g.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},d=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,l=e.originalType,g=e.parentName,s=o(e,["components","mdxType","originalType","parentName"]),d=p(n),u=r,y=d["".concat(g,".").concat(u)]||d[u]||m[u]||l;return n?a.createElement(y,i(i({ref:t},s),{},{components:n})):a.createElement(y,i({ref:t},s))}));function u(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=n.length,i=new Array(l);i[0]=d;var o={};for(var g in t)hasOwnProperty.call(t,g)&&(o[g]=t[g]);o.originalType=e,o.mdxType="string"==typeof e?e:r,i[1]=o;for(var p=2;p<l;p++)i[p]=n[p];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}d.displayName="MDXCreateElement"},72818:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>g,contentTitle:()=>i,default:()=>m,frontMatter:()=>l,metadata:()=>o,toc:()=>p});var a=n(58168),r=(n(96540),n(15680));const l={id:"nginx",title:"Monitoring Nginx",sidebar_label:"Nginx Monitor",keywords:["open source monitoring tool","open source java monitoring tool","monitoring nginx metrics"]},i=void 0,o={unversionedId:"help/nginx",id:"version-v1.6.x/help/nginx",title:"Monitoring Nginx",description:"Collect and monitor the general performance Metrics of Nginx.",source:"@site/versioned_docs/version-v1.6.x/help/nginx.md",sourceDirName:"help",slug:"/help/nginx",permalink:"/docs/v1.6.x/help/nginx",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.6.x/help/nginx.md",tags:[],version:"v1.6.x",frontMatter:{id:"nginx",title:"Monitoring Nginx",sidebar_label:"Nginx Monitor",keywords:["open source monitoring tool","open source java monitoring tool","monitoring nginx metrics"]},sidebar:"docs",previous:{title:"SSL Monitor",permalink:"/docs/v1.6.x/help/ssl_cert"},next:{title:"mailbox Monitor",permalink:"/docs/v1.6.x/help/imap"}},g={},p=[{value:"Need Enable <code>ngx_http_stub_status_module</code> And <code>ngx_http_reqstat_module</code> Module",id:"need-enable-ngx_http_stub_status_module-and-ngx_http_reqstat_module-module",level:3},{value:"Enable <code>ngx_http_stub_status_module</code>",id:"enable-ngx_http_stub_status_module",level:3},{value:"Enable <code>ngx_http_reqstat_module</code>",id:"enable-ngx_http_reqstat_module",level:3},{value:"Configuration parameter",id:"configuration-parameter",level:3},{value:"Collection Metrics",id:"collection-metrics",level:3},{value:"Metrics Set\uff1anginx_status",id:"metrics-setnginx_status",level:4},{value:"Metrics Set\uff1areq_status",id:"metrics-setreq_status",level:4}],s={toc:p};function m(e){let{components:t,...n}=e;return(0,r.yg)("wrapper",(0,a.A)({},s,n,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Collect and monitor the general performance Metrics of Nginx.")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Protocol Use\uff1aNginx")),(0,r.yg)("h3",{id:"need-enable-ngx_http_stub_status_module-and-ngx_http_reqstat_module-module"},"Need Enable ",(0,r.yg)("inlineCode",{parentName:"h3"},"ngx_http_stub_status_module")," And ",(0,r.yg)("inlineCode",{parentName:"h3"},"ngx_http_reqstat_module")," Module"),(0,r.yg)("p",null,"If you want to monitor information in 'Nginx' with this monitoring type, you need to modify your nginx configure file for enable the module monitor."),(0,r.yg)("h3",{id:"enable-ngx_http_stub_status_module"},"Enable ",(0,r.yg)("inlineCode",{parentName:"h3"},"ngx_http_stub_status_module")),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Check if ",(0,r.yg)("inlineCode",{parentName:"p"},"ngx_http_stub_status_module")," has been added"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"nginx -V\n")),(0,r.yg)("p",{parentName:"li"},"View whether it contains ",(0,r.yg)("inlineCode",{parentName:"p"},"--with-http_stub_status_module"),", if not, you need to recompile and install Nginx.")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Compile and install Nginx, add ",(0,r.yg)("inlineCode",{parentName:"p"},"ngx_http_stub_status_module")," module"),(0,r.yg)("p",{parentName:"li"},"Download Nginx and unzip it, execute the following command in the directory"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"\n./configure --prefix=/usr/local/nginx --with-http_stub_status_module\n\nmake && make install\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Modify Nginx configure file"),(0,r.yg)("p",{parentName:"li"},"Modify the ",(0,r.yg)("inlineCode",{parentName:"p"},"nginx.conf")," file and add the monitoring module exposed endpoint, as follows:"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"# modify nginx.conf\nserver {\n        listen 80; # port\n        server_name localhost;\n        location /nginx-status {\n                stub_status     on;\n                access_log      on;\n                #allow 127.0.0.1; #only allow requests from localhost\n              #deny all;  #deny all other hosts\n        }\n}\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Reload Nginx"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"\nnginx -s reload\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Access ",(0,r.yg)("inlineCode",{parentName:"p"},"http://localhost/nginx-status")," in the browser to view the Nginx monitoring status information."))),(0,r.yg)("h3",{id:"enable-ngx_http_reqstat_module"},"Enable ",(0,r.yg)("inlineCode",{parentName:"h3"},"ngx_http_reqstat_module")),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Install ",(0,r.yg)("inlineCode",{parentName:"p"},"ngx_http_reqstat_module")),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"}," # install `ngx_http_reqstat_module`\n wget https://github.com/zls0424/ngx_req_status/archive/master.zip -O ngx_req_status.zip\n \n unzip ngx_req_status.zip\n \n patch -p1 < ../ngx_req_status-master/write_filter.patch\n \n ./configure --prefix=/usr/local/nginx --add-module=/path/to/ngx_req_status-master\n \n make -j2\n \n make install\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Modify Nginx configure file"),(0,r.yg)("p",{parentName:"li"},"update ",(0,r.yg)("inlineCode",{parentName:"p"},"nginx.conf")," file, add status module exposed endpoint, as follows:"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"# modify nginx.conf\nhttp {\n    req_status_zone server_name $server_name 256k;\n    req_status_zone server_addr $server_addr 256k;\n\n    req_status server_name server_addr;\n\n    server {\n        location /req-status {\n            req_status_show on;\n            #allow 127.0.0.1; #only allow requests from localhost\n          #deny all;  #deny all other hosts\n        }\n    }\n}\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Reload Nginx"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"\nnginx -s reload\n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Access ",(0,r.yg)("inlineCode",{parentName:"p"},"http://localhost/req-status")," in the browser to view the Nginx monitoring status information."))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Refer Doc: ",(0,r.yg)("a",{parentName:"strong",href:"https://github.com/zls0424/ngx_req_status"},"https://github.com/zls0424/ngx_req_status"))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u26a0\ufe0fAttention: The endpoint path of the monitoring module is ",(0,r.yg)("inlineCode",{parentName:"strong"},"/nginx-status")," ",(0,r.yg)("inlineCode",{parentName:"strong"},"/req-status"))),(0,r.yg)("h3",{id:"configuration-parameter"},"Configuration parameter"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Parameter name"),(0,r.yg)("th",{parentName:"tr",align:null},"Parameter help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Monitoring Host"),(0,r.yg)("td",{parentName:"tr",align:null},"Monitored IPV4, IPV6 or domain name. Note\u26a0\ufe0fWithout protocol header (eg: https://, http://)")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Monitoring name"),(0,r.yg)("td",{parentName:"tr",align:null},"Identify the name of this monitoring. The name needs to be unique")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Port"),(0,r.yg)("td",{parentName:"tr",align:null},"Port provided by Nginx")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Timeout"),(0,r.yg)("td",{parentName:"tr",align:null},"Allow collection response time")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Collection interval"),(0,r.yg)("td",{parentName:"tr",align:null},"Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Whether to detect"),(0,r.yg)("td",{parentName:"tr",align:null},"Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Description remarks"),(0,r.yg)("td",{parentName:"tr",align:null},"For more information about identifying and describing this monitoring, users can note information here")))),(0,r.yg)("h3",{id:"collection-metrics"},"Collection Metrics"),(0,r.yg)("h4",{id:"metrics-setnginx_status"},"Metrics Set\uff1anginx_status"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"accepts"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Accepted connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"handled"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Successfully processed connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"active"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Currently active connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"dropped"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Discarded connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"requests"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Client requests")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"reading"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Connections performing read operations")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"writing"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Connections performing write operations")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"waiting"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Waiting connections")))),(0,r.yg)("h4",{id:"metrics-setreq_status"},"Metrics Set\uff1areq_status"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"Metric name"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric unit"),(0,r.yg)("th",{parentName:"tr",align:null},"Metric help description"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"zone_name"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Group category")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"key"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Group name")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"max_active"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Maximum concurrent connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"max_bw"),(0,r.yg)("td",{parentName:"tr",align:null},"kb"),(0,r.yg)("td",{parentName:"tr",align:null},"Maximum bandwidth")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"traffic"),(0,r.yg)("td",{parentName:"tr",align:null},"kb"),(0,r.yg)("td",{parentName:"tr",align:null},"Total traffic")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"requests"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Total requests")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"active"),(0,r.yg)("td",{parentName:"tr",align:null}),(0,r.yg)("td",{parentName:"tr",align:null},"Current concurrent connections")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"bandwidth"),(0,r.yg)("td",{parentName:"tr",align:null},"kb"),(0,r.yg)("td",{parentName:"tr",align:null},"Current bandwidth")))))}m.isMDXComponent=!0}}]);