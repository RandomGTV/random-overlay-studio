import test from'node:test';import assert from'node:assert/strict';
import{DEFAULT_CONFIG,validateConfig,normalizeRewardCampaigns,selectShowcase,MAX_FEED_AGE}from'../core.js';
const now=Date.parse('2030-01-01T12:00:00Z'),date=t=>new Date(t).toISOString(),cfg=patch=>validateConfig({...structuredClone(DEFAULT_CONFIG),...patch}),fresh=date(now);
const profile={isLive:true,gameId:'42',gameName:'HITMAN',checkedAt:fresh};
const drop={id:'d',name:'Drop',start:now-1,end:now+60000,gameId:'42',gameName:'HITMAN'};
function campaign(patch={}){return{id:'c',name:'Campaign',brand:'Brand',status:'UNKNOWN',isSitewide:true,startsAt:date(now-1000),endsAt:date(now+7200000),summary:'Terms apply.',unlockRequirements:{minuteWatchedGoal:20,subsGoal:1},rewards:[{id:'r',name:'Badge',earnableUntil:date(now+3600000),thumbnailImage:{image1xURL:'https://static-cdn.jtvnw.net/badge.png'}}],...patch};}
const rewards=()=>normalizeRewardCampaigns([campaign()]);
test('campaign cards preserve watch/purchase requirements, expiry and safe art',()=>{
 const [r]=rewards();assert.equal(r.kind,'reward');assert.equal(r.requirement,'20 min watch time + 1 qualifying subscription(s)');assert.equal(r.end,now+3600000);assert.equal(r.sitewide,true);assert.match(r.terms,/eligibility/);assert.match(r.image,/static-cdn/);
});
test('group-specific requirements override campaign requirements and ignore duplicate rows',()=>{
 const r={id:'r',name:'One'},g={id:'g',rewards:[r,r],unlockRequirements:{subsGoal:2,turboSubsGoal:1,eventTriggerGoal:3}};
 const cards=normalizeRewardCampaigns([campaign({rewardGroups:[g]})]);assert.equal(cards.length,1);assert.match(cards[0].requirement,/2 qualifying subscription/);assert.doesNotMatch(cards[0].requirement,/20 min/);assert.match(cards[0].requirement,/Turbo/);assert.match(cards[0].requirement,/campaign action/);
});
test('bad dates, ended status and hostile artwork are rejected',()=>{
 for(const patch of [{startsAt:'bad'},{endsAt:date(now-2000)},{status:'EXPIRED'},{status:'PAUSED'}])assert.equal(normalizeRewardCampaigns([campaign(patch)]).length,0);
 const r=campaign();r.rewards[0].thumbnailImage.image1xURL='https://evil.test/badge';assert.equal(normalizeRewardCampaigns([r])[0].image,'');
 r.rewards[0].earnableUntil='invalid';assert.equal(normalizeRewardCampaigns([r]).length,0);
});
test('active matching Drops always take priority over Reward Campaigns',()=>{
 const s=selectShowcase([drop],rewards(),cfg({}),profile,fresh,fresh,now);assert.equal(s.kind,'drops');assert.equal(s.cards[0].id,'d');
});
test('no matching Drops selects current reward campaigns even if category is offline',()=>{
 for(const p of [profile,{...profile,isLive:false},null]){const s=selectShowcase([],rewards(),cfg({}),p,fresh,fresh,now);assert.equal(s.kind,'rewards');assert.equal(s.cards[0].name,'Badge');}
});
test('current reward campaigns beat future Drops; upcoming Drops remain when no current campaigns exist',()=>{
 const future={...drop,start:now+10000,end:now+20000};
 assert.equal(selectShowcase([future],rewards(),cfg({}),profile,fresh,fresh,now).kind,'rewards');
 assert.equal(selectShowcase([future],[],cfg({}),profile,fresh,fresh,now).cards[0].id,'d');
});
test('stale, expired, future and game-mismatched reward campaigns do not appear',()=>{
 assert.equal(selectShowcase([],rewards(),cfg({}),profile,fresh,date(now-MAX_FEED_AGE-1),now).kind,'branding');
 for(const r of [{...rewards()[0],end:now},{...rewards()[0],start:now+1},{...rewards()[0],sitewide:false,gameId:'99',gameName:'Other'}])
  assert.equal(selectShowcase([],[r],cfg({}),profile,fresh,fresh,now).cards.length,0);
 const matching={...rewards()[0],sitewide:false,gameId:'42'};
 assert.equal(selectShowcase([],[matching],cfg({}),profile,fresh,fresh,now).cards.length,1);
 assert.equal(selectShowcase([],[matching],cfg({}),null,fresh,fresh,now).cards.length,0);
});
test('empty and unavailable feeds stay branded and old configs enable showcase safely',()=>{
 assert.equal(selectShowcase([],[],cfg({}),null,null,null,now).kind,'branding');
 assert.equal(cfg({}).design.showRewardShowcase,true);
 assert.equal(cfg({design:{showRewardShowcase:false}}).design.showRewardShowcase,false);
 assert.throws(()=>cfg({design:{showRewardShowcase:'yes'}}));
});
