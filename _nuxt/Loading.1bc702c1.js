import{b as a,a as i,o as t,f as o,i as e,t as r,q as n}from"./entry.8c945047.js";const c=a({props:{progress:{type:Number,default:0},progress_max:{type:Number,default:0},progress_msg:{type:String,default:""}},watch:{async progress_msg(){return await new Promise(s=>setTimeout(s,10))}}}),p=""+new URL("spin.bb60cdbf.gif",import.meta.url).href,_={class:"h-full"},m={class:"flex items-center h-full"},l={class:"m-auto items-center flex flex-col"},d=e("div",{class:"items-center flex"},[e("img",{class:"w-20px h-20px icon",src:p}),e("span",{class:"ml-5px"}," Loading... ")],-1),f={key:0,class:"text-center"},g={key:1};function u(s,h,x,v,y,b){return t(),o("div",_,[e("div",m,[e("div",l,[d,e("div",null,[s.progress_max?(t(),o("div",f,r(s.progress)+"/"+r(s.progress_max),1)):n("",!0),s.progress_msg?(t(),o("div",g,r(s.progress_msg),1)):n("",!0)])])])])}const k=i(c,[["render",u]]);export{k as _};
