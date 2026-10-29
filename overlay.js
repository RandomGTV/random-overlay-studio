import{selectShowcase,themeFor,countdown,freshAt,MAX_PROFILE_AGE,gameKey,validateConfig}from'./core.js';
import{LiveData,getJson,watchVersion}from'./data.js';
const el=id=>document.getElementById(id),text=(id,value)=>{el(id).textContent=value;},data=new LiveData();
let library={themes:[{id:'drops',accent:'#b087ff',secondary:'#31ddff',background:'#0b111d',surface:'#20223c',artwork:'themes/drops.png'}]},previewConfig=null,lastImage='',lastAvatar='',lastCard='';
const assetVersion=new URL(import.meta.url).searchParams.get('v')||'dev';
const params=new URLSearchParams(location.search);document.body.dataset.bars=['top','bottom'].includes(params.get('bars'))?params.get('bars'):'both';
if(params.get('preview')==='1'&&window.parent!==window){window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='overlay-preview')return;try{previewConfig=validateConfig(e.data.config);const f=e.data.feed;if(f){data.profile=f.profile||null;data.cards=Array.isArray(f.cards)?f.cards:[];data.rewardCards=Array.isArray(f.rewardCards)?f.rewardCards:[];data.feedUpdatedAt=f.feedUpdatedAt;data.rewardUpdatedAt=f.rewardUpdatedAt;}render();}catch{}});}
function render(){
 const now=Date.now(),c=previewConfig||data.config,d=c.design,p=data.profile,pFresh=p&&freshAt(p.checkedAt,MAX_PROFILE_AGE,now),s=selectShowcase(data.cards,data.rewardCards,c,p,data.feedUpdatedAt,data.rewardUpdatedAt,now);
 const index=s.cards.length?Math.floor(now/(c.rotationSeconds*1000))%s.cards.length:0,card=s.cards[index],upcoming=card&&card.start>now,reward=card?.kind==='reward',showcase=!!card&&d.showRewardShowcase;
 const theme=themeFor(library,c,card?.gameName||s.gameName,card?.gameId||s.gameId),root=document.documentElement.style;
 for(const k of ['accent','secondary','background','surface'])root.setProperty('--'+k,theme[k]);
 root.setProperty('--texture',`url("assets/${theme.artwork}?v=${assetVersion}")`);
 const height=showcase?({minimal:96,balanced:144,detailed:176}[d.density]):card||d.quietMode!=='compact'?({minimal:64,balanced:88,detailed:112}[d.density]):64;
 root.setProperty('--height',height/19.2+'vw');root.setProperty('--footer-height',(d.footerSize==='slim'?64:96)/19.2+'vw');
 Object.assign(document.body.dataset,{density:d.density,motion:d.motion,edge:d.borderMotion,ring:String(d.logoRing),footer:d.footerSize,theme:theme.id,phase:card?(upcoming?'upcoming':'active'):'branding',showcase:String(showcase),kind:s.kind});
 el('bottom').hidden=!d.footerEnabled;el('artwork-wrap').hidden=!d.showArtwork;
 const display=p?.displayName||c.channel;text('channel',display);text('game',(s.gameName||'TWITCH / 24/7 RERUN').toUpperCase());
 text('followers',pFresh&&d.showChannelStats&&p.followers!==null?p.followers.toLocaleString()+' followers':'');
 const avatar=p?.logo||'assets/channel-logo.png';if(avatar!==lastAvatar){lastAvatar=avatar;el('avatar').src=avatar;}
 text('reward-name',card?.name||(pFresh&&p.streamTitle)||"You're watching "+display);
 text('eyebrow',card?(reward?'TWITCH REWARD CAMPAIGNS / ':upcoming?'UPCOMING DROPS / ':'DROPS / ')+card.campaign:'24/7 RERUN / FOLLOW & SUPPORT');
 text('requirement',card?.requirement||'Enjoy the rerun. Follow the channel for more.');
 text('reminder',reward?'Campaign offer · Check participating categories and account eligibility':upcoming?'Scheduled reward / Watch time starts after the campaign begins':'Link your game account / Claim rewards in Twitch Inventory');
 el('reminder').hidden=!card;
 text('campaign-detail',reward?card.detail:'');el('campaign-detail').hidden=!reward||!card.detail;
 text('reward-position',card?String(index+1).padStart(2,'0')+' / '+String(s.cards.length).padStart(2,'0'):'');
 text('reward-scope',reward?(card.sitewide?'TWITCH-WIDE OFFER · TERMS APPLY':'GAME CAMPAIGN · CHECK ELIGIBILITY'):card?(upcoming?'UPCOMING REWARD':'CAMPAIGN REWARD'):'');
 el('showcase-meta').hidden=!card;
 text('timer-label',card?(upcoming?'STARTS IN':'ENDS IN'):'JOIN THE CHANNEL');text('timer',card?countdown(upcoming?card.start:card.end,now):'twitch.tv/'+c.channel);
 text('rotation-label',s.cards.length>1?'NEXT REWARD':'REWARD SHOWCASE');
 el('rotation-track').hidden=!showcase||s.cards.length<2;
 el('rotation-fill').style.transform='scaleX('+(1-(now%(c.rotationSeconds*1000))/(c.rotationSeconds*1000))+')';
 const image=d.showArtwork?card?.image||'':'';
 if(image!==lastImage){lastImage=image;el('artwork').hidden=true;if(image)el('artwork').src=image;else el('artwork').removeAttribute('src');}
 el('artwork-wrap').dataset.empty=String(!image);
 const key=card?.id||'branding';
 if(key!==lastCard){lastCard=key;el('reward').classList.remove('reward-enter');void el('reward').offsetWidth;el('reward').classList.add('reward-enter');}
 text('footer-name',display);text('footer-login',c.channel);
 const confirmed=!reward&&c.categorySource==='twitch'&&s.gameStatus==='detected'&&d.confirmedDropsGame&&d.confirmedDropsGame===gameKey(s.gameName,s.gameId);
 text('footer-label',card?(reward?'TWITCH REWARD CAMPAIGNS · CHECK TERMS':upcoming?'UPCOMING DROPS':confirmed?'DROPS ENABLED · CONFIRMED FOR THIS CATEGORY':'REWARDS AVAILABLE · CHECK CAMPAIGN REQUIREMENTS'):'FOLLOW & SUPPORT');
 const messages=d.footerMessages.length?d.footerMessages:reward?['Reward Campaigns are separate from game Drops. Check the campaign terms.','Some offers require qualifying subscriptions or purchases. Requirements vary.','Check participating categories and your account eligibility on Twitch.']:card?['Link your game account before watching for rewards.','Claim completed rewards in your Twitch Inventory.','Check the campaign’s eligible channels and requirements.']:['Enjoy the stream. Follow the channel for more.','A 24/7 rerun — thanks for watching RANDOM_gtv.'];
 text('footer-message',messages[Math.floor(now/(d.footerRotationSeconds*1000))%messages.length]);
 text('footer-detail',reward?'Reward Campaigns · Availability is not channel confirmation':d.footerShowStats&&pFresh&&p.followers!==null?p.followers.toLocaleString()+' followers · '+(s.gameName||'RANDOM_gtv'):s.gameName||'Rewards follow the current Twitch category');
}
el('avatar').onerror=()=>{if(el('avatar').getAttribute('src')!=='assets/channel-logo.png')el('avatar').src='assets/channel-logo.png';};
el('artwork').onload=()=>{el('artwork').hidden=!lastImage;};el('artwork').onerror=()=>{el('artwork').hidden=true;el('artwork-wrap').dataset.empty='true';};
data.addEventListener('change',render);render();
try{library=await getJson(new URL('assets/themes/library.json',import.meta.url));}catch{}
if(!(params.get('preview')==='1'&&window.parent!==window))void data.start();const tick=setInterval(render,1000),stopVersion=watchVersion();
window.addEventListener('pagehide',()=>{data.stop();clearInterval(tick);stopVersion();});
