import{validateConfig,selectCards,gameKey,freshAt,MAX_PROFILE_AGE,MAX_FEED_AGE,countdown}from'./core.js';
import{LiveData,getJson,watchVersion}from'./data.js';
const $=id=>document.getElementById(id),data=new LiveData();let draft,library,dirty=false;
const initialControls=[...document.querySelectorAll('button,input,select,textarea')];initialControls.forEach(e=>e.disabled=true);
const designStrings=['density','motion','borderMotion','quietMode','regularTheme','footerSize'];
const designChecks=['showArtwork','logoRing','showUpcoming','showChannelStats','footerEnabled','footerShowStats'];
const numberFields=['rotationSeconds','upcomingHours','footerRotationSeconds'];
const baseUrl=new URL('overlay.html',location.href).href;$('overlay-url').value=baseUrl;
function message(text){$('message').textContent=text;}
async function copy(value){try{await navigator.clipboard.writeText(value);message('Copied. Paste this URL into your OBS Browser Source.');}catch{$('overlay-url').value=value;$('overlay-url').focus();$('overlay-url').select();message('Select and copy the URL from the connection field.');}}
$('copy-url').onclick=()=>copy(baseUrl);$('copy-top').onclick=()=>copy(baseUrl+'?bars=top');$('copy-bottom').onclick=()=>copy(baseUrl+'?bars=bottom');
function sendPreview(){if(!draft)return;$('preview').contentWindow.postMessage({type:'overlay-preview',config:draft},location.origin);}
$('preview').addEventListener('load',sendPreview);
function ensureOption(select,value){if(![...select.options].some(o=>o.value===String(value))){const o=new Option(String(value)+' seconds',String(value));select.add(o);}select.value=String(value);}
function category(){return selectCards(data.cards,draft,data.profile,data.feedUpdatedAt);}
function fill(){
 for(const key of designStrings)$(key).value=draft.design[key];for(const key of designChecks)$(key).checked=draft.design[key];
 ensureOption($('rotationSeconds'),draft.rotationSeconds);$('upcomingHours').value=String(draft.design.upcomingHours);$('footerRotationSeconds').value=String(draft.design.footerRotationSeconds);
 $('mode').value=draft.mode;$('categorySource').value=draft.categorySource;$('manualGameName').value=draft.manualGameName;
 $('footerMessages').value=draft.design.footerMessages.join('\n');$('manualCards').value=JSON.stringify(draft.manualCards.map(({name,requirement,image,startAt,endAt})=>({name,requirement,image,startAt,endAt})),null,2);
 document.querySelectorAll('input[name=theme]').forEach(r=>r.checked=r.value===draft.design.theme);visibility();updateAssignment();sendPreview();
}
function visibility(){$('manual-game-field').hidden=$('categorySource').value!=='manual';$('manual-cards-field').hidden=$('mode').value!=='manual';}
function updateAssignment(){if(!draft)return;const s=category(),key=gameKey(s.gameName,s.gameId);$('gameTheme').disabled=!key||s.gameStatus==='all_games';$('gameTheme').value=draft.design.gameThemes[key]||'';$('game-theme-help').textContent=key&&s.gameStatus!=='all_games'?'Assignment for '+s.gameName+'. Used when Auto is selected.':'A current or manually chosen category is needed for a per-game assignment.';
 const valid=s.gameStatus==='detected'&&draft.categorySource==='twitch';$('dropsConfirmed').disabled=!valid;$('dropsConfirmed').checked=Boolean(valid&&draft.design.confirmedDropsGame===key);}
function readForm(){
 const c=structuredClone(draft);for(const k of designStrings)c.design[k]=$(k).value;for(const k of designChecks)c.design[k]=$(k).checked;
 c.rotationSeconds=Number($('rotationSeconds').value);c.design.upcomingHours=Number($('upcomingHours').value);c.design.footerRotationSeconds=Number($('footerRotationSeconds').value);
 c.design.theme=document.querySelector('input[name=theme]:checked')?.value||'auto';c.design.footerMessages=$('footerMessages').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 c.mode=$('mode').value;c.categorySource=$('categorySource').value;c.manualGameName=$('manualGameName').value.trim();if(c.manualGameName!==draft.manualGameName)c.manualGameId='';
 c.manualCards=JSON.parse($('manualCards').value||'[]');return validateConfig(c);
}
function changed(){visibility();try{draft=readForm();dirty=true;$('preview-status').textContent='Unpublished draft';message('Preview updated. Publish config.json through GitHub to change the OBS output.');updateAssignment();sendPreview();status();}catch(e){message(e.message);}}
for(const id of [...designStrings,...designChecks,...numberFields,'mode','categorySource','manualGameName','footerMessages','manualCards'])$(id).addEventListener('change',changed);
for(const id of ['manualGameName','footerMessages','manualCards'])$(id).addEventListener('input',changed);
$('gameTheme').onchange=()=>{try{const c=readForm(),s=selectCards(data.cards,c,data.profile,data.feedUpdatedAt),key=gameKey(s.gameName,s.gameId);if(!key)return;if($('gameTheme').value)c.design.gameThemes[key]=$('gameTheme').value;else delete c.design.gameThemes[key];draft=validateConfig(c);dirty=true;$('preview-status').textContent='Unpublished draft';sendPreview();message('Game assignment updated in the preview. Publish the settings to apply it to OBS.');}catch(e){message(e.message);}};
$('dropsConfirmed').onchange=()=>{const s=category();draft.design.confirmedDropsGame=$('dropsConfirmed').checked&&s.gameStatus==='detected'?gameKey(s.gameName,s.gameId):'';dirty=true;$('preview-status').textContent='Unpublished draft';sendPreview();};
$('reset-preview').onclick=()=>{draft=structuredClone(data.config);dirty=false;$('preview-status').textContent='Published settings';fill();status();message('Preview reset to the published settings.');};
$('download-config').onclick=()=>{try{draft=readForm();const c=structuredClone(draft);c.manualCards=c.manualCards.map(({name,requirement,image,startAt,endAt})=>({name,requirement,image,startAt,endAt}));const blob=new Blob([JSON.stringify(c,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='config.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);message('Settings downloaded. Replace config.json in the repository, then commit. Your OBS URL stays the same.');}catch(e){message(e.message);}};
$('import-config').onchange=async()=>{const f=$('import-config').files[0];if(!f)return;try{if(f.size>100000)throw Error('Settings file is too large.');draft=validateConfig(JSON.parse(await f.text()));if(draft.channel!==data.config.channel||draft.channelId!==data.config.channelId)throw Error('This dashboard imports settings for the published channel only. Change the channel identity in GitHub first.');dirty=true;fill();$('preview-status').textContent='Imported draft';message('Imported for preview. Publish the settings to update OBS.');}catch(e){message(e.message);}finally{$('import-config').value='';}};
$('refresh-data').onclick=async()=>{const b=$('refresh-data');b.disabled=true;b.textContent='Refreshing…';await Promise.allSettled([data.readProfile(),data.readDrops()]);b.disabled=false;b.textContent='Refresh data';};
function status(){
 if(!draft)return;const p=data.profile,pFresh=p&&freshAt(p.checkedAt,MAX_PROFILE_AGE),s=category();
 $('channel-name').textContent=p?.displayName||draft.channel;if(p?.logo)$('channel-logo').src=p.logo;
 $('channel-state').textContent=pFresh?(p.isLive?'Live on Twitch':'Currently offline'):'Channel data unavailable or stale';$('live-status').textContent=pFresh?(p.isLive?'LIVE':'OFFLINE'):'CONNECTING';$('live-status').classList.toggle('live',Boolean(pFresh&&p.isLive));
 $('current-game').textContent=s.gameName||(s.gameStatus==='not_live'?'Offline':'Unavailable');$('reward-count').textContent=String(s.cards.length);
 $('feed-status').textContent=freshAt(data.feedUpdatedAt,MAX_FEED_AGE)?'Feed updated '+new Date(data.feedUpdatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'Feed unavailable or stale';
 const lineup=$('reward-lineup');lineup.replaceChildren();if(!s.cards.length){const p=document.createElement('p');p.className='muted';p.textContent=s.gameStatus==='not_live'?'The channel is offline. Branding stays visible until a live category and eligible rewards are available.':'No matching active or upcoming rewards. Channel branding stays visible.';lineup.append(p);}
 for(const card of s.cards.slice(0,24)){const item=document.createElement('div');item.className='reward-item';if(card.image){const img=document.createElement('img');img.src=card.image;img.alt='';img.onerror=()=>img.hidden=true;item.append(img);}const copy=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=card.name;detail.textContent=card.requirement+' · '+(card.start>Date.now()?'Starts in '+countdown(card.start):'Ends in '+countdown(card.end));copy.append(name,detail);item.append(copy);lineup.append(item);}
 $('diagnostics').textContent=['Channel: '+draft.channel,'Published settings: '+(data.errors.config||'Loaded'),'Category: '+s.gameStatus,'Profile checked: '+(p?.checkedAt||'Waiting'),'Drops feed: '+data.source,'Feed updated: '+(data.feedUpdatedAt||'Waiting'),'Eligible rewards in feed: '+data.cards.length,...Object.values(data.errors),'Code updates: automatic check every 60 seconds','Settings updates: automatic check every 15 seconds after deployment'].join('\n');updateAssignment();
}
$('channel-logo').onerror=()=>{$('channel-logo').onerror=null;$('channel-logo').src='assets/channel-logo.png';};
await data.readConfig();draft=structuredClone(data.config);
try{library=await getJson(new URL('assets/themes/library.json',import.meta.url));for(const t of library.themes){const label=document.createElement('label');label.className='theme-option';const radio=document.createElement('input');radio.type='radio';radio.name='theme';radio.value=t.id;radio.addEventListener('change',changed);const img=document.createElement('img');img.src='assets/'+t.preview;img.alt='';img.loading='lazy';const name=document.createElement('strong');name.textContent=t.name;const desc=document.createElement('small');desc.textContent=t.games;label.append(img,radio,name,desc);$('theme-grid').append(label);$('gameTheme').add(new Option(t.name,t.id));}}catch(e){message('Theme previews unavailable: '+e.message);}
 document.querySelector('input[name=theme][value=auto]').addEventListener('change',changed);initialControls.forEach(e=>e.disabled=false);fill();status();
 data.addEventListener('change',()=>{if(!dirty){draft=structuredClone(data.config);fill();}status();});void data.start();const timer=setInterval(status,15000),stopVersion=watchVersion();window.addEventListener('pagehide',()=>{data.stop();clearInterval(timer);stopVersion();});
