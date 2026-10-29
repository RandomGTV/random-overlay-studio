import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{selectShowcase,themeFor,countdown,freshAt,MAX_PROFILE_AGE,gameKey,validateConfig,DEFAULT_CONFIG}from'../core.js';
const source=(await readFile(new URL('../overlay.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'');
async function boot({embedded=false,drop=false}={}){
 const nodes=new Map(),listeners={},timers=[],now=Date.now(),nodesFor=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,dataset:{},style:{setProperty(k,v){this[k]=v}},classList:{add(){},remove(){}},getAttribute(k){return this[k]},removeAttribute(k){delete this[k]},offsetWidth:1});return nodes.get(id)};
 const document={getElementById:nodesFor,body:{dataset:{}},documentElement:{style:{setProperty(k,v){this[k]=v}}}};
 let instance;
 class LiveData extends EventTarget{
  constructor(){super();instance=this;this.config=validateConfig(DEFAULT_CONFIG);this.profile={isLive:true,gameId:'42',gameName:'HITMAN',checkedAt:new Date(now).toISOString(),displayName:'RANDOM_gtv',followers:1};this.feedUpdatedAt=this.rewardUpdatedAt=new Date(now).toISOString();this.cards=drop?[{id:'drop',name:'Active Drop',start:now-10000,end:now+3600000,gameId:'42',gameName:'HITMAN',requirement:'Watch 60 min',campaign:'Game campaign'}]:[];this.rewardCards=[{id:'reward',kind:'reward',name:'Reward Badge',campaign:'Brand offer',requirement:'1 qualifying subscription(s)',detail:'New subscribers only. Terms apply.',start:now-10000,end:now+3600000,sitewide:true,image:'https://static-cdn.jtvnw.net/badge.png'}];}
  start(){this.started=true}stop(){}
 }
 const window={addEventListener:(type,fn)=>listeners[type]=fn};window.parent=embedded?{}:window;
 const location={search:embedded?'?preview=1':'',origin:'https://example.test',href:'https://example.test/overlay.html'};
 const args={selectShowcase,themeFor,countdown,freshAt,MAX_PROFILE_AGE,gameKey,validateConfig,LiveData,getJson:async()=>({themes:[{id:'drops',accent:'#abc',secondary:'#def',background:'#123',surface:'#456',artwork:'themes/drops.png'}]}),watchVersion:()=>()=>{},document,window,parent:window.parent,location,URL,URLSearchParams,setInterval:fn=>(timers.push(fn),timers.length),clearInterval:()=>{}};
 await new (Object.getPrototypeOf(async function(){}).constructor)(...Object.keys(args),source.replaceAll('import.meta.url',JSON.stringify('https://example.test/overlay.js?v=test')))(...Object.values(args));
 return{nodes:nodesFor,instance,window,location,listeners,timers,document};
}
test('real overlay renderer labels Reward Campaigns and keeps purchase requirement visible',async()=>{
 const x=await boot();assert.equal(x.document.body.dataset.kind,'rewards');assert.equal(x.document.body.dataset.showcase,'true');assert.equal(x.nodes('reward-name').textContent,'Reward Badge');assert.match(x.nodes('requirement').textContent,/subscription/);assert.match(x.nodes('eyebrow').textContent,/TWITCH REWARD CAMPAIGNS/);assert.doesNotMatch(x.nodes('footer-label').textContent,/DROPS ENABLED/);assert.equal(x.nodes('rotation-track').hidden,true);
 x.instance.cards=[{id:'drop',name:'Actual Drop',campaign:'Game',requirement:'Watch 60 min',start:Date.now()-1,end:Date.now()+100000,gameId:'42',gameName:'HITMAN'}];x.timers[0]();assert.equal(x.nodes('reward-name').textContent,'Actual Drop');assert.equal(x.document.body.dataset.kind,'drops');
});
test('embedded preview receives parent feeds without additional provider requests and rejects foreign messages',async()=>{
 const x=await boot({embedded:true});assert.equal(x.instance.started,undefined);
 x.listeners.message({source:{},origin:x.location.origin,data:{type:'overlay-preview',config:DEFAULT_CONFIG}});assert.equal(x.nodes('reward-name').textContent,'Reward Badge');
 const config=validateConfig({...DEFAULT_CONFIG,design:{showRewardShowcase:false}});
 x.listeners.message({source:x.window.parent,origin:x.location.origin,data:{type:'overlay-preview',config,feed:{cards:[],rewardCards:[],profile:null,feedUpdatedAt:null,rewardUpdatedAt:null}}});
 assert.equal(x.document.body.dataset.kind,'branding');assert.equal(x.document.body.dataset.showcase,'false');assert.match(x.nodes('reward-name').textContent,/watching/);
});
