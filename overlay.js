import{selectCards,themeFor,countdown,freshAt,MAX_PROFILE_AGE,gameKey,validateConfig}from'./core.js';
import{LiveData,getJson,watchVersion}from'./data.js';
const el=id=>document.getElementById(id),text=(id,value)=>{el(id).textContent=value;},data=new LiveData();
let library={themes:[{id:'drops',accent:'#b087ff',secondary:'#31ddff',background:'#0b111d',surface:'#20223c',artwork:'themes/drops.png'}]},previewConfig=null,lastImage='',lastAvatar='';
const assetVersion=new URL(import.meta.url).searchParams.get('v')||'dev';
const params=new URLSearchParams(location.search);document.body.dataset.bars=['top','bottom'].includes(params.get('bars'))?params.get('bars'):'both';
// Only an embedded dashboard on this origin may supply temporary preview settings.
if(params.get('preview')==='1'&&window.parent!==window){window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='overlay-preview')return;try{previewConfig=validateConfig(e.data.config);render();}catch{}});}
function render(){
 const now=Date.now(),c=previewConfig||data.config,d=c.design,p=data.profile,pFresh=p&&freshAt(p.checkedAt,MAX_PROFILE_AGE,now),s=selectCards(data.cards,c,p,data.feedUpdatedAt,now);
 const index=s.cards.length?Math.floor(now/(c.rotationSeconds*1000))%s.cards.length:0,card=s.cards[index],upcoming=card&&card.start>now;
 const theme=themeFor(library,c,card?.gameName||s.gameName,card?.gameId||s.gameId),root=document.documentElement.style;
 for(const k of ['accent','secondary','background','surface'])root.setProperty('--'+k,theme[k]);
 root.setProperty('--texture',`url("assets/${theme.artwork}?v=${assetVersion}")`);
 const height=card||d.quietMode!=='compact'?({minimal:64,balanced:88,detailed:112}[d.density]):64;
 root.setProperty('--height',height/19.2+'vw');root.setProperty('--footer-height',(d.footerSize==='slim'?64:96)/19.2+'vw');
 Object.assign(document.body.dataset,{density:d.density,motion:d.motion,edge:d.borderMotion,ring:String(d.logoRing),footer:d.footerSize,theme:theme.id,phase:card?(upcoming?'upcoming':'active'):'branding'});
 el('bottom').hidden=!d.footerEnabled;el('artwork-wrap').hidden=!d.showArtwork;
 const display=p?.displayName||c.channel;text('channel',display);text('game',(s.gameName||'TWITCH / 24/7 RERUN').toUpperCase());
 text('followers',pFresh&&d.showChannelStats&&p.followers!==null?p.followers.toLocaleString()+' followers':'');
 const avatar=p?.logo||'assets/channel-logo.png';if(avatar!==lastAvatar){lastAvatar=avatar;el('avatar').src=avatar;}
 text('reward-name',card?.name||(pFresh&&p.streamTitle)||"You're watching "+display);
 text('eyebrow',card?(upcoming?'UPCOMING / ':'DROPS / ')+card.campaign:'24/7 RERUN / FOLLOW & SUPPORT');
 text('requirement',card?.requirement||'Enjoy the rerun. Follow the channel for more.');
 text('reminder',upcoming?'Scheduled reward / Watch time starts after the campaign begins':'Link your game account / Claim rewards in Twitch Inventory');
 el('reminder').hidden=!card;
 text('timer-label',card?(upcoming?'STARTS IN':'ENDS IN'):'JOIN THE CHANNEL');text('timer',card?countdown(upcoming?card.start:card.end,now):'twitch.tv/'+c.channel);
 const image=d.showArtwork?card?.image||'':'';if(image!==lastImage){lastImage=image;el('artwork').hidden=true;if(image)el('artwork').src=image;else el('artwork').removeAttribute('src');}
 text('footer-name',display);text('footer-login',c.channel);
 const confirmed=c.categorySource==='twitch'&&s.gameStatus==='detected'&&d.confirmedDropsGame&&d.confirmedDropsGame===gameKey(s.gameName,s.gameId);
 text('footer-label',card?(upcoming?'UPCOMING DROPS':confirmed?'DROPS ENABLED · CONFIRMED FOR THIS CATEGORY':'REWARDS AVAILABLE · CHECK CAMPAIGN REQUIREMENTS'):'FOLLOW & SUPPORT');
 const messages=d.footerMessages.length?d.footerMessages:card?['Link your game account before watching for rewards.','Claim completed rewards in your Twitch Inventory.','Check the campaign’s eligible channels and requirements.']:['Enjoy the stream. Follow the channel for more.','A 24/7 rerun — thanks for watching RANDOM_gtv.'];
 text('footer-message',messages[Math.floor(now/(d.footerRotationSeconds*1000))%messages.length]);
 text('footer-detail',d.footerShowStats&&pFresh&&p.followers!==null?p.followers.toLocaleString()+' followers · '+(s.gameName||'RANDOM_gtv'):s.gameName||'Rewards follow the current Twitch category');
}
// A failed image never hides the branded base.
el('avatar').onerror=()=>{if(el('avatar').getAttribute('src')!=='assets/channel-logo.png')el('avatar').src='assets/channel-logo.png';};
el('artwork').onload=()=>{el('artwork').hidden=false;};el('artwork').onerror=()=>{el('artwork').hidden=true;};
data.addEventListener('change',render);render();
try{library=await getJson(new URL('assets/themes/library.json',import.meta.url));}catch{}
void data.start();const tick=setInterval(render,1000),stopVersion=watchVersion();
window.addEventListener('pagehide',()=>{data.stop();clearInterval(tick);stopVersion();});
