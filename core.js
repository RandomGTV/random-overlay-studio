export const DEFAULT_DESIGN={theme:'auto',regularTheme:'drops',gameThemes:{},density:'balanced',motion:'sweep',borderMotion:'glow',logoRing:true,showChannelStats:true,showArtwork:true,showUpcoming:true,upcomingHours:72,quietMode:'branding',footerEnabled:true,footerSize:'regular',footerRotationSeconds:15,footerShowStats:true,footerMessages:[],confirmedDropsGame:''};
export const DEFAULT_CONFIG={schemaVersion:1,channel:'random_gtv',channelId:'190784868',mode:'auto',rotationSeconds:12,categorySource:'twitch',manualGameName:'',manualGameId:'',manualCards:[],design:DEFAULT_DESIGN};
export const MAX_FEED_AGE=7200000,MAX_PROFILE_AGE=300000;
export function gameKey(name,id=''){return String(id||name||'').normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');}
export function artworkUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='static-cdn.jtvnw.net'&&!u.username&&!u.password&&(!u.port||u.port==='443');}catch{return false;}}
export function freshAt(date,maxAge,now=Date.now()){const age=now-Date.parse(date);return Number.isFinite(age)&&age>=-300000&&age<=maxAge;}
export function validateConfig(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Settings must be a JSON object.');
 const c={...DEFAULT_CONFIG,...input,design:{...DEFAULT_DESIGN,...input.design}},d=c.design;
 if(!/^[a-zA-Z0-9_]{1,25}$/.test(c.channel)||!/^\d+$/.test(String(c.channelId)))throw Error('Invalid channel identity.');
 if(!['auto','manual'].includes(c.mode)||!['twitch','manual','all'].includes(c.categorySource))throw Error('Invalid data mode.');
 if(!Number.isInteger(c.rotationSeconds)||c.rotationSeconds<6||c.rotationSeconds>60)throw Error('Reward rotation must be 6–60 seconds.');
 if(typeof c.manualGameName!=='string'||c.manualGameName.length>150||!/^\d*$/.test(String(c.manualGameId)))throw Error('Invalid game.');
 if(c.categorySource==='manual'&&!c.manualGameName.trim()&&!c.manualGameId)throw Error('Enter a manual game name or ID.');
 const themes=['stealth','tactical','neon','ember','arctic','drops','midnight','royal'];
 for(const[k,allowed]of Object.entries({theme:['auto',...themes],regularTheme:['drops','midnight','royal'],density:['minimal','balanced','detailed'],motion:['none','sweep','shimmer'],borderMotion:['none','glow','trace'],quietMode:['branding','compact'],footerSize:['regular','slim']}))if(!allowed.includes(d[k]))throw Error('Invalid design setting: '+k);
 for(const k of ['logoRing','showChannelStats','showArtwork','showUpcoming','footerEnabled','footerShowStats'])if(typeof d[k]!=='boolean')throw Error(k+' must be true or false.');
 if(![24,72,168].includes(d.upcomingHours))throw Error('Upcoming window must be 24, 72 or 168 hours.');
 if(!Number.isInteger(d.footerRotationSeconds)||d.footerRotationSeconds<8||d.footerRotationSeconds>60)throw Error('Footer rotation must be 8–60 seconds.');
 if(!Array.isArray(d.footerMessages)||d.footerMessages.length>8||d.footerMessages.some(x=>typeof x!=='string'||!x.trim()||x.length>160))throw Error('Use up to eight footer messages, 1–160 characters each.');
 if(!d.gameThemes||typeof d.gameThemes!=='object'||Array.isArray(d.gameThemes)||Object.entries(d.gameThemes).length>100||Object.entries(d.gameThemes).some(([k,v])=>k.length>150||!themes.includes(v)))throw Error('Invalid per-game themes.');
 if(typeof d.confirmedDropsGame!=='string'||d.confirmedDropsGame.length>150)throw Error('Invalid Drops confirmation.');
 if(!Array.isArray(c.manualCards)||c.manualCards.length>50)throw Error('Use at most 50 manual rewards.');
 c.manualCards=c.manualCards.map((card,i)=>{const start=Date.parse(card.startAt),end=Date.parse(card.endAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!/(Z|[+-]\d{2}:\d{2})$/.test(card.startAt)||!/(Z|[+-]\d{2}:\d{2})$/.test(card.endAt))throw Error('Reward dates need timezones and an end after the start.');
 if(typeof card.name!=='string'||!card.name.trim()||card.name.length>120||typeof card.requirement!=='string'||!card.requirement.trim()||card.requirement.length>180)throw Error('Each reward needs a name and requirement.');
 if(card.image&&!artworkUrl(card.image))throw Error('Reward artwork must use the Twitch image CDN.');
 return{id:'manual:'+i,name:card.name.trim(),requirement:card.requirement.trim(),campaign:'Manual schedule',image:card.image||'',startAt:card.startAt,endAt:card.endAt,start,end};});return c;
}
export function normalizeDrops(games,config=DEFAULT_CONFIG){
 if(!Array.isArray(games))throw Error('Unexpected Drops feed.');const cards=[];
 for(const game of games){if(!game?.gameDisplayName)continue;for(const campaign of game.rewards||[]){
 if(!['ACTIVE','UPCOMING'].includes(campaign.status))continue;const allow=campaign.allow||{};
 if(allow.isEnabled!==false&&!(allow.channels||[]).some(c=>String(c.name).toLowerCase()===config.channel.toLowerCase()||String(c.id)===String(config.channelId)))continue;
 for(const drop of campaign.timeBasedDrops||[]){const start=Math.max(Date.parse(campaign.startAt),Date.parse(drop.startAt)),end=Math.min(Date.parse(campaign.endAt),Date.parse(drop.endAt));if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
 const requirements=[];if(Number(drop.requiredMinutesWatched)>0)requirements.push('Watch '+Number(drop.requiredMinutesWatched)+' min');if(Number(drop.requiredSubs)>0)requirements.push(Number(drop.requiredSubs)+' qualifying subscription(s)');if(drop.preconditionDrops?.length)requirements.push('Previous reward required');
 for(const edge of drop.benefitEdges||[]){const b=edge.benefit;if(!b?.id||!drop.id||!campaign.id)continue;
 cards.push({id:campaign.id+':'+drop.id+':'+b.id,name:String(b.name||drop.name||'Reward').slice(0,120),campaign:String(campaign.name||'Drops campaign').slice(0,120),gameName:String(game.gameDisplayName).slice(0,150),gameId:String(game.gameId||''),requirement:requirements.join(' + ')||'Check campaign requirements',image:artworkUrl(b.imageAssetURL)?b.imageAssetURL:'',start,end});}}}}return cards;
}
export function parseProfile(payload,config=DEFAULT_CONFIG,now=Date.now()){
 if(!Array.isArray(payload))throw Error('Unexpected channel response.');const u=payload.find(x=>String(x.login).toLowerCase()===config.channel.toLowerCase()&&String(x.id)===String(config.channelId));
 if(!u||!Object.hasOwn(u,'stream')||(u.stream!==null&&typeof u.stream!=='object'))throw Error('Channel lookup returned an invalid identity or stream.');const clean=(s,max)=>typeof s==='string'?s.replace(/\s+/g,' ').trim().slice(0,max):'';
 return{displayName:clean(u.displayName,60)||config.channel,followers:Number.isSafeInteger(u.followers)?u.followers:null,logo:artworkUrl(u.logo)?u.logo:'',checkedAt:new Date(now).toISOString(),isLive:u.stream!==null,gameName:clean(u.stream?.game?.displayName,150),gameId:String(u.stream?.game?.id||''),streamTitle:clean(u.stream?.title,300),viewersCount:Number.isSafeInteger(u.stream?.viewersCount)?u.stream.viewersCount:null};
}
export function selectCards(cards,config,profile,feedUpdatedAt,now=Date.now()){
 let gameName='',gameId='',gameStatus='unavailable',result=[];
 if(config.categorySource==='all'){gameName='All games';gameStatus='all_games';}else if(config.categorySource==='manual'){gameName=config.manualGameName;gameId=config.manualGameId;gameStatus='manual';}else if(profile&&freshAt(profile.checkedAt,MAX_PROFILE_AGE,now)){gameName=profile.gameName;gameId=profile.gameId;gameStatus=profile.isLive&&gameName?'detected':'not_live';}
 if(config.mode==='manual')result=config.manualCards;else if(freshAt(feedUpdatedAt,MAX_FEED_AGE,now)){if(config.categorySource==='all')result=cards;else if(['manual','detected'].includes(gameStatus))result=cards.filter(c=>gameId?c.gameId===String(gameId):gameKey(c.gameName)===gameKey(gameName));}
 const d=config.design;result=result.filter(c=>c.end>now&&c.end>c.start&&(c.start<=now||d.showUpcoming&&c.start<=now+d.upcomingHours*3600000)).toSorted((a,b)=>(a.start>now)-(b.start>now)||a.start-b.start||String(a.id).localeCompare(String(b.id)));return{cards:result,gameName,gameId,gameStatus};
}
export function themeFor(library,config,gameName='',gameId=''){
 const d=config.design;let key=d.theme;if(key==='auto'){key=d.gameThemes[gameKey(gameName,gameId)];if(!key){const n=gameKey(gameName),groups=[['stealth',['hitman','assassin','valorant']],['tactical',['counter-strike','call of duty','battlefield','escape from tarkov']],['ember',['warcraft','diablo','elden ring','throne','elder scrolls']],['neon',['fortnite','cyberpunk','apex','marvel']],['arctic',['destiny','warframe','overwatch','sea of thieves']]];key=groups.find(([,terms])=>terms.some(t=>n.includes(t)))?.[0]||d.regularTheme;}}return library.themes.find(t=>t.id===key)||library.themes.find(t=>t.id==='drops');
}
export function countdown(target,now=Date.now()){const m=Math.max(0,Math.ceil((target-now)/60000));return m>=1440?Math.floor(m/1440)+'d '+Math.floor(m%1440/60)+'h':m>=60?Math.floor(m/60)+'h '+m%60+'m':m+'m';}
