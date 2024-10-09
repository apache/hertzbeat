"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[67665],{15680:(e,t,a)=>{a.d(t,{xA:()=>m,yg:()=>u});var n=a(96540);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function o(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?o(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):o(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function l(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},o=Object.keys(e);for(n=0;n<o.length;n++)a=o[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)a=o[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var s=n.createContext({}),p=function(e){var t=n.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},m=function(e){var t=p(e.components);return n.createElement(s.Provider,{value:t},e.children)},c={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},g=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,o=e.originalType,s=e.parentName,m=l(e,["components","mdxType","originalType","parentName"]),g=p(a),u=r,d=g["".concat(s,".").concat(u)]||g[u]||c[u]||o;return a?n.createElement(d,i(i({ref:t},m),{},{components:a})):n.createElement(d,i({ref:t},m))}));function u(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var o=a.length,i=new Array(o);i[0]=g;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:r,i[1]=l;for(var p=2;p<o;p++)i[p]=a[p];return n.createElement.apply(null,i)}return n.createElement.apply(null,a)}g.displayName="MDXCreateElement"},99409:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>i,default:()=>c,frontMatter:()=>o,metadata:()=>l,toc:()=>p});var n=a(58168),r=(a(96540),a(15680));const o={id:"contribution",title:"Contributor Guide",sidebar_position:0},i=void 0,l={unversionedId:"community/contribution",id:"version-v1.5.x/community/contribution",title:"Contributor Guide",description:"\x3c!--",source:"@site/versioned_docs/version-v1.5.x/community/contribution.md",sourceDirName:"community",slug:"/community/contribution",permalink:"/docs/v1.5.x/community/contribution",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/versioned_docs/version-v1.5.x/community/contribution.md",tags:[],version:"v1.5.x",sidebarPosition:0,frontMatter:{id:"contribution",title:"Contributor Guide",sidebar_position:0},sidebar:"docs",previous:{title:"Development",permalink:"/docs/v1.5.x/community/development"},next:{title:"Mailing Lists",permalink:"/docs/v1.5.x/community/mailing_lists"}},s={},p=[{value:"Kinds of Contributions",id:"kinds-of-contributions",level:3},{value:"Getting HertzBeat up and running",id:"getting-hertzbeat-up-and-running",level:3},{value:"Backend start",id:"backend-start",level:4},{value:"Frontend start",id:"frontend-start",level:4},{value:"Find tasks",id:"find-tasks",level:3},{value:"Submit Pull Request",id:"submit-pull-request",level:3},{value:"Wait for the code to be merged",id:"wait-for-the-code-to-be-merged",level:3},{value:"After the code is merged",id:"after-the-code-is-merged",level:3},{value:"HertzBeat Improvement Proposal (HIP)",id:"hertzbeat-improvement-proposal-hip",level:3},{value:"How to become a Committer?",id:"how-to-become-a-committer",level:3},{value:"Join Discussion",id:"join-discussion",level:3},{value:"\ud83e\udd50 Architecture",id:"-architecture",level:2}],m={toc:p};function c(e){let{components:t,...o}=e;return(0,r.yg)("wrapper",(0,n.A)({},m,o,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"We are committed to maintaining a happy community that helps each other, welcome every contributor to join us!")),(0,r.yg)("h3",{id:"kinds-of-contributions"},"Kinds of Contributions"),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"In the HertzBeat community, there are many ways to contribute:")),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\ud83d\udcbb",(0,r.yg)("strong",{parentName:"p"},"Code"),": Can help the community complete some tasks, write new features or fix some bugs;")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\u26a0\ufe0f",(0,r.yg)("strong",{parentName:"p"},"Test"),": Can come to participate in the writing of test code, including unit testing, integration testing, e2e testing;")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\ud83d\udcd6",(0,r.yg)("strong",{parentName:"p"},"Docs"),": Can write or Documentation improved to help users better understand and use HertzBeat;")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\ud83d\udcdd",(0,r.yg)("strong",{parentName:"p"},"Blog"),": You can write articles about HertzBeat to help the community better promote;")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\ud83e\udd14",(0,r.yg)("strong",{parentName:"p"},"Discussion"),": You can participate in the discussion of new features of HertzBeat and integrate your ideas with HertzBeat;")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\ud83d\udca1",(0,r.yg)("strong",{parentName:"p"},"Preach"),": Can help publicize or promote the HertzBeat community, speak in meetup or summit;")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\ud83d\udcac",(0,r.yg)("strong",{parentName:"p"},"Suggestion"),": You can also make some suggestions to the project or community to promote the healthy development of the community;"))),(0,r.yg)("p",null,"More see ",(0,r.yg)("a",{parentName:"p",href:"https://allcontributors.org/docs/en/emoji-key"},"Contribution Types")),(0,r.yg)("p",null,"Even small corrections to typos are very welcome :)"),(0,r.yg)("h3",{id:"getting-hertzbeat-up-and-running"},"Getting HertzBeat up and running"),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"To get HertzBeat code running on your development tools, and able to debug with breakpoints.\nThis is a front-end and back-end separation project. To start the local code, the back-end manager and the front-end web-app must be started separately.")),(0,r.yg)("h4",{id:"backend-start"},"Backend start"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Requires ",(0,r.yg)("inlineCode",{parentName:"p"},"maven3+"),", ",(0,r.yg)("inlineCode",{parentName:"p"},"java17")," and ",(0,r.yg)("inlineCode",{parentName:"p"},"lombok")," environments")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"(Optional) Modify the configuration file: ",(0,r.yg)("inlineCode",{parentName:"p"},"manager/src/main/resources/application.yml"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Execute under the project root directory: ",(0,r.yg)("inlineCode",{parentName:"p"},"mvn clean install -DskipTests"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Start ",(0,r.yg)("inlineCode",{parentName:"p"},"springboot manager")," service: ",(0,r.yg)("inlineCode",{parentName:"p"},"manager/src/main/java/org/apache/hertzbeat/manager/Manager.java")))),(0,r.yg)("h4",{id:"frontend-start"},"Frontend start"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Need ",(0,r.yg)("inlineCode",{parentName:"p"},"Node Yarn")," Environment, Make sure ",(0,r.yg)("inlineCode",{parentName:"p"},"Node.js >= 18"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Cd to the ",(0,r.yg)("inlineCode",{parentName:"p"},"web-app")," directory: ",(0,r.yg)("inlineCode",{parentName:"p"},"cd web-app"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Install yarn if not existed ",(0,r.yg)("inlineCode",{parentName:"p"},"npm install -g yarn"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Install Dependencies: ",(0,r.yg)("inlineCode",{parentName:"p"},"yarn install")," or ",(0,r.yg)("inlineCode",{parentName:"p"},"yarn install --registry=https://registry.npmmirror.com")," in ",(0,r.yg)("inlineCode",{parentName:"p"},"web-app"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Install angular-cli globally: ",(0,r.yg)("inlineCode",{parentName:"p"},"yarn global add @angular/cli@15")," or ",(0,r.yg)("inlineCode",{parentName:"p"},"yarn global add @angular/cli@15 --registry=https://registry.npmmirror.com"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"After the local backend is started, start the local frontend in the web-app directory: ",(0,r.yg)("inlineCode",{parentName:"p"},"ng serve --open"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Browser access to localhost:4200 to start, default account/password is ",(0,r.yg)("em",{parentName:"p"},"admin/hertzbeat")))),(0,r.yg)("h3",{id:"find-tasks"},"Find tasks"),(0,r.yg)("p",null,"Find the issue you are interested in! On our GitHub repo issue list, we often publish some issues with the label good first issue or status: volunteer wanted.\nThese issues welcome the help of contributors. Among them, good first issues tend to have low thresholds and are suitable for novices."),(0,r.yg)("p",null,"Of course, if you have a good idea, you can also propose it directly on GitHub Discussion or contact with community."),(0,r.yg)("h3",{id:"submit-pull-request"},"Submit Pull Request"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"First you need to fork your target ",(0,r.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat"},"hertzbeat repository"),".")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Then download the code locally with git command:"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"git clone git@github.com:${YOUR_USERNAME}/hertzbeat.git #Recommended  \n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"After the download is complete, please refer to the getting started guide or README file of the target repository to initialize the project.")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Then, you can refer to the following command to submit the code:"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"git checkout -b a-feature-branch #Recommended  \n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Submit the coed as a commit, the commit message format specification required: ","[module name or type name]","feature or bugfix or doc: custom message."),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"git add <modified file/path> \ngit commit -m '[docs]feature: necessary instructions' #Recommended \n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Push to the remote repository"),(0,r.yg)("pre",{parentName:"li"},(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"git push origin a-feature-branch   \n"))),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("p",{parentName:"li"},"Then you can initiate a new PR (Pull Request) on GitHub."))),(0,r.yg)("p",null,"Please note that the title of the PR needs to conform to our spec, and write the necessary description in the PR to facilitate code review by Committers and other contributors."),(0,r.yg)("h3",{id:"wait-for-the-code-to-be-merged"},"Wait for the code to be merged"),(0,r.yg)("p",null,"After submitting the PR, the Committee or the community's friends will review the code you submitted (Code Review), and will propose some modification suggestions or conduct some discussions. Please pay attention to your PR in time."),(0,r.yg)("p",null,"If subsequent changes are required, there is no need to initiate a new PR. After submitting a commit on the original branch and pushing it to the remote repository, the PR will be automatically updated."),(0,r.yg)("p",null,"In addition, our project has a relatively standardized and strict CI inspection process. After submitting PR, CI will be triggered. Please pay attention to whether it passes the CI inspection."),(0,r.yg)("p",null,"Finally, the Committers can merge the PR into the master branch."),(0,r.yg)("h3",{id:"after-the-code-is-merged"},"After the code is merged"),(0,r.yg)("p",null,"After the code has been merged, you can delete the development branch on both the local and remote repositories:"),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"git branch -d a-dev-branch\ngit push origin --delete a-dev-branch\n")),(0,r.yg)("p",null,"On the master/main branch, you can do the following to sync the upstream repository:"),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-shell"},"git remote add upstream https://github.com/apache/hertzbeat.git #Bind the remote warehouse, if it has been executed, it does not need to be executed again\ngit checkout master \ngit pull upstream master\n")),(0,r.yg)("h3",{id:"hertzbeat-improvement-proposal-hip"},"HertzBeat Improvement Proposal (HIP)"),(0,r.yg)("p",null,"If you have major new features(e.g., support metrics push gateway, support logs monitoring), you need to write a design document known as a HertzBeat Improvement Proposal (HIP). Before starting to write a HIP, make sure you follow the process ",(0,r.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/hip"},"here"),"."),(0,r.yg)("h3",{id:"how-to-become-a-committer"},"How to become a Committer?"),(0,r.yg)("p",null,"With the above steps, you are a contributor to HertzBeat. Repeat the previous steps to stay active in the community, keep at, you can become a Committer!"),(0,r.yg)("h3",{id:"join-discussion"},"Join Discussion"),(0,r.yg)("p",null,(0,r.yg)("a",{parentName:"p",href:"https://lists.apache.org/list.html?dev@hertzbeat.apache.org"},"Join the Mailing Lists")," : Mail to ",(0,r.yg)("inlineCode",{parentName:"p"},"dev-subscribe@hertzbeat.apache.org")," to subscribe mailing lists."),(0,r.yg)("p",null,"Add WeChat account ",(0,r.yg)("inlineCode",{parentName:"p"},"ahertzbeat")," to pull you into the WeChat group."),(0,r.yg)("h2",{id:"-architecture"},"\ud83e\udd50 Architecture"),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("strong",{parentName:"li"},(0,r.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/manager"},"manager"))," Provide monitoring management, system management basic services.")),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Provides monitoring management, monitoring configuration management, system user management, etc."),(0,r.yg)("ul",{parentName:"blockquote"},(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("strong",{parentName:"li"},(0,r.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/collector"},"collector"))," Provide metrics data collection services.\nUse common protocols to remotely collect and obtain peer-to-peer metrics data."),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("strong",{parentName:"li"},(0,r.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/warehouse"},"warehouse"))," Provide monitoring data warehousing services.\nMetrics data management, data query, calculation and statistics."),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("strong",{parentName:"li"},(0,r.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/alerter"},"alerter"))," Provide alert service.\nAlarm calculation trigger, monitoring status linkage, alarm configuration, and alarm notification."),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("strong",{parentName:"li"},(0,r.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/web-app"},"web-app"))," Provide web ui.\nAngular Web UI."))),(0,r.yg)("p",null,(0,r.yg)("img",{alt:"hertzBeat",src:a(72428).A,width:"2814",height:"1772"})))}c.isMDXComponent=!0},72428:(e,t,a)=>{a.d(t,{A:()=>n});const n=a.p+"assets/images/hertzbeat-arch-d8c2eca122dd35a5e67678da69c8ba0c.png"}}]);