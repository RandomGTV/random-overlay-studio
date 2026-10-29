import{DEFAULT_CONFIG,validateConfig,normalizeDrops,normalizeRewardCampaigns,parseProfile,freshAt,MAX_FEED_AGE}from'./core.js';
export async function getJson(url,maxBytes=8000000){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000),credentials:'omit'});if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();if(t.length>maxBytes)throw Error('Response too large.');return JSON.parse(t);}
async function publicFeed(file,route){
 const key="random-overlay-feed:"+file;
 try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved&&Date.now()-saved.cachedAt>=0&&Date.now()-saved.cachedAt<300000&&freshAt(saved.payload.lastUpdatedAt,MAX_FEED_AGE)&&Array.isArray(saved.payload.data))return saved.payload;}catch{}
 const keep=payload=>{if(!Array.isArray(payload.data))throw Error("Invalid campaign data.");try{localStorage.setItem(key,JSON.stringify({cachedAt:Date.now(),payload}));}catch{}return payload;};
 const errors=[];
 try{
  const commits=await getJson('https://api.github.com/repos/SunkwiBOT/twitch-drops-api/commits?path='+file+'&per_page=1'),c=commits[0];
  if(!/^[a-f0-9]{40}$/.test(c?.sha))throw Error('Invalid feed commit.');
  const date=c.commit?.committer?.date;
  if(!freshAt(date,MAX_FEED_AGE))throw Error('Feed is older than two hours.');
  return keep({lastUpdatedAt:date,data:await getJson('https://raw.githubusercontent.com/SunkwiBOT/twitch-drops-api/'+c.sha+'/'+file),source:'SunkwiBOT public GitHub mirror'});
 }catch(e){errors.push(e.message);}
 try{
  const payload=await getJson('https://twitch-drops-api.sunkwi.com/v2/'+route);
  if(!freshAt(payload.lastUpdatedAt,MAX_FEED_AGE))throw Error('Feed is older than two hours.');
  return keep({...payload,source:'Sunkwi public API'});
 }catch(e){errors.push(e.message);}
 throw Error(errors.join(' / '));
}
export class LiveData extends EventTarget{
 constructor(){super();this.config=validateConfig(DEFAULT_CONFIG);this.profile=null;this.cards=[];this.rewardCards=[];this.feedUpdatedAt=null;this.rewardUpdatedAt=null;this.errors={};this.source='Waiting for live data';this.rewardSource='Waiting for reward campaigns';this.timers=[];this.disposed=false;}
 emit(){if(!this.disposed)this.dispatchEvent(new Event('change'));}
 async readConfig(){try{const c=validateConfig(await getJson(new URL('config.json?t='+Date.now(),import.meta.url)));const changed=this.config.channel!==c.channel||this.config.channelId!==c.channelId;this.config=c;if(changed){this.profile=null;this.cards=[];this.rewardCards=[];this.feedUpdatedAt=null;this.rewardUpdatedAt=null;}delete this.errors.config;if(changed){void this.readProfile();void this.readDrops();void this.readRewards();}}catch(e){this.errors.config='Published settings: '+e.message;}this.emit();}
 async readProfile(){const identity=this.config.channel+':'+this.config.channelId;try{const payload=await getJson('https://api.ivr.fi/v2/twitch/user?login='+encodeURIComponent(this.config.channel));if(identity!==this.config.channel+':'+this.config.channelId)return;this.profile=parseProfile(payload,this.config);delete this.errors.profile;}catch(e){this.errors.profile='Channel lookup: '+e.message;}this.emit();}
 async readDrops(){const identity=this.config.channel+':'+this.config.channelId;try{const payload=await publicFeed('drops.json','drops');if(identity!==this.config.channel+':'+this.config.channelId)return;this.cards=normalizeDrops(payload.data,this.config);this.feedUpdatedAt=payload.lastUpdatedAt;this.source=payload.source;delete this.errors.drops;}catch(e){this.errors.drops='Drops lookup: '+e.message;}this.emit();}
 async readRewards(){const identity=this.config.channel+':'+this.config.channelId;try{const payload=await publicFeed('rewards.json','rewards');if(identity!==this.config.channel+':'+this.config.channelId)return;this.rewardCards=normalizeRewardCampaigns(payload.data);this.rewardUpdatedAt=payload.lastUpdatedAt;this.rewardSource=payload.source;delete this.errors.rewards;}catch(e){this.errors.rewards='Reward campaigns: '+e.message;}this.emit();}
 async start(){await this.readConfig();if(this.disposed)return;void this.readProfile();void this.readDrops();void this.readRewards();this.timers=[setInterval(()=>void this.readConfig(),15000),setInterval(()=>void this.readProfile(),60000),setInterval(()=>void this.readDrops(),300000),setInterval(()=>void this.readRewards(),300000)];}
 stop(){this.disposed=true;this.timers.forEach(clearInterval);}
}
export function watchVersion(){let version=new URL(import.meta.url).searchParams.get('v');const check=async()=>{try{const v=await getJson(new URL('version.json?t='+Date.now(),import.meta.url));if(!v.id)return;if(version&&version!==v.id){const next=new URL(location.href);next.searchParams.set('_release',v.id);location.replace(next.href);return;}version=v.id;}catch{}};void check();const timer=setInterval(check,60000);return()=>clearInterval(timer);}
