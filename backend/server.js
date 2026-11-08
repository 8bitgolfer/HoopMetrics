import http from "node:http";
import OpenAI from "openai";

const PORT=Number(process.env.PORT||3000);
const API_KEY=process.env.GEMINI_API_KEY;
const MODEL=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
const ORIGIN=process.env.ALLOWED_ORIGIN||"https://8bitgolfer.github.io";
const MAX_DAILY=Number(process.env.MAX_DAILY_REQUESTS||300);
const base="https://raw.githubusercontent.com/Baileyd18/NBA-Player-Impact-and-Value-Dashboard-2025-26/main/Data/";
const client=API_KEY?new OpenAI({apiKey:API_KEY,baseURL:"https://generativelanguage.googleapis.com/v1beta/openai/"}):null;
let cache=null,loadedAt=0,totalCalls=0,day=new Date().toISOString().slice(0,10);
const traffic=new Map();
function num(v){const z=Number(v);return v==null||v===""||!Number.isFinite(z)?null:z}
function csv(source){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'&&source[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}
 else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell=""}else if(c==='\n'){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}else cell+=c}
 if(cell||row.length){row.push(cell);rows.push(row)}
 const head=rows.shift()||[];return rows.filter(r=>r.length===head.length).map(r=>Object.fromEntries(head.map((k,i)=>[k,r[i]])));
}
function id(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"")}
function unique(rows){
 const map=new Map();for(const r of rows){const key=id(r.Player),team=r.Team||"",old=map.get(key);if(!key)continue;
 const tot=t=>/^(?:[2-9]TM|TOT)$/.test(t);
 if(!old||(tot(team)&&!tot(old.Team))||(tot(team)===tot(old.Team)&&(num(r.G)||0)>(num(old.G)||0)))map.set(key,r);
 }return map;
}
async function load(){
 if(cache&&Date.now()-loadedAt<24*60*60*1000)return cache;
 const [pg,ad]=await Promise.all(["raw_per_game.csv","raw_advanced.csv"].map(async path=>{
  const response=await fetch(base+path,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error("NBA source unavailable: "+response.status);return csv(await response.text());
 }));
 const advanced=unique(ad),players=[];
 for(const [key,r] of unique(pg)){
  const a=advanced.get(key)||{},games=num(r.G)||0,pts=num(r.PTS)||0,fga=num(r.FGA)||0,fta=num(r.FTA)||0;
  const ts=num(a["TS%"])??(fga+.44*fta?pts/(2*(fga+.44*fta)):null);
  const efg=num(r["eFG%"]);
  const n=(v)=>num(v)||0,perTsa=fga+.44*fta;
  players.push({name:r.Player,team:r.Team,pos:r.Pos,games,starts:n(r.GS),mpg:n(r.MP),
   ppg:pts,fga,fta,tsa:games*perTsa,ts:ts===null?null:100*ts,tsPlus:ts===null?null:100*ts/.581,
   rts:ts===null?null:100*(ts-.581),efg:efg===null?null:100*efg,efgPlus:efg===null?null:100*efg/.546,
   paa:perTsa?pts-2*perTsa*.581:null,usage:num(a["USG%"]),
   ast:n(r.AST),tov:n(r.TOV),astTo:n(r.TOV)>0?n(r.AST)/n(r.TOV):null,astPct:num(a["AST%"]),tovPct:num(a["TOV%"]),
   stl:n(r.STL),blk:n(r.BLK),stlPct:num(a["STL%"]),blkPct:num(a["BLK%"]),orbPct:num(a["ORB%"]),drbPct:num(a["DRB%"]),trbPct:num(a["TRB%"]),
   bpm:num(a.BPM),obpm:num(a.OBPM),dbpm:num(a.DBPM),vorp:num(a.VORP),ws:num(a.WS),per:num(a.PER),
   qualified:games>=41&&games*perTsa>=500
  });
 }
 cache=players;loadedAt=Date.now();return cache;
}

const LIVE_CSV="https://www.boxscorelab.com/downloads/2026-27-player-season-totals.csv";
let liveCache=null,liveLoadedAt=0;
const cleanKey=x=>String(x).toLowerCase().replace(/[^a-z0-9]/g,"");
function pickField(row,...names){
 const fields=new Map(Object.entries(row).map(([k,v])=>[cleanKey(k),v]));
 for(const name of names){const v=fields.get(cleanKey(name));if(v!==undefined&&v!==null&&String(v).trim()!=="")return v}
 return null;
}
function pctField(v){const x=num(v);return x===null?null:(Math.abs(x)<=1?x*100:x)}
async function loadLive(){
 if(liveCache&&Date.now()-liveLoadedAt<60*60*1000)return liveCache;
 const res=await fetch(LIVE_CSV,{signal:AbortSignal.timeout(16000),headers:{"user-agent":"HoopMetrics/1.0 (public stats dashboard)"}});
 if(!res.ok)throw Error("2026-27 data download failed: "+res.status);
 const raw=await res.text();
 if(raw.length>1500000)throw Error("Season source exceeded reasonable size");
 const rows=csv(raw);
 const archived=await load().catch(()=>[]);
 const positions=new Map(archived.map(p=>[id(p.name),p.pos]));
 const parsed=[];
 for(const r of rows){
  const name=pickField(r,"player","player_name","name","full_name","playerName");
  const games=num(pickField(r,"gp","g","games","games_played"));
  if(!name||!games||games<1)continue;
  const total=(...keys)=>num(pickField(r,...keys));
  const pt=total("pts","points","total_points","points_total");
  const fg=total("fga","field_goal_attempts","field_goals_attempted");
  const ft=total("fta","free_throw_attempts","free_throws_attempted");
  if(pt===null||fg===null||ft===null)continue;
  const fgm=total("fgm","field_goals_made")||0,threes=total("fg3m","3pm","three_pm","three_pointers_made")||0;
  const minutes=total("min","mp","minutes","minutes_played")||0;
  const assists=total("ast","assists")||0,turnovers=total("tov","to","turnovers")||0;
  const starts=total("gs","games_started","starts");
  const team=String(pickField(r,"team","team_abbr","team_abbreviation","team_code","tm")||"—");
  const pos=String(pickField(r,"pos","position","player_position")||positions.get(id(name))||"—");
  const tsa=fg+.44*ft,ts=tsa?pt/(2*tsa):null,efg=fg?(fgm+.5*threes)/fg:null;
  parsed.push({name:String(name).trim(),team,pos,games,starts:starts??null,mpg:minutes/games,points:pt/games,
   fga:fg/games,fta:ft/games,ast:assists/games,tov:turnovers/games,
   stl:(total("stl","steals")||0)/games,blk:(total("blk","blocks")||0)/games,
   ts:ts===null?null:100*ts,efg:efg===null?null:100*efg,tsa,
   astto:turnovers?assists/turnovers:null,
   usage:pctField(pickField(r,"usg_pct","usg%","usage_pct","usage_rate","usg")),
   astpct:pctField(pickField(r,"ast_pct","ast%","assist_pct","assist_percentage")),
   tovpct:pctField(pickField(r,"tov_pct","tov%","turnover_pct","turnover_rate"))??(tsa+turnovers?100*turnovers/(tsa+turnovers):null),
   ftr:fg?ft/fg:null,threepar:fg?(total("fg3a","3pa","three_point_attempts")||0)/fg:null,
   orb:pctField(pickField(r,"orb_pct","orb%")),drb:pctField(pickField(r,"drb_pct","drb%")),trb:pctField(pickField(r,"trb_pct","trb%")),
   stlpct:null,blkpct:null,bpm:null,obpm:null,dbpm:null,vorp:null,ws:null,ws48:null,ows:null,dws:null,per:null,
   age:total("age"),made:fgm,threeMade:threes,pointsTotal:pt,fgaTotal:fg,ftaTotal:ft});
 }
 if(parsed.length<100)throw Error("Season feed has "+parsed.length+" valid rows; check upstream CSV column format");
 const tsDen=parsed.reduce((z,p)=>z+p.fgaTotal+.44*p.ftaTotal,0)*2;
 const tsNum=parsed.reduce((z,p)=>z+p.pointsTotal,0);
 const leagueTS=tsDen?tsNum/tsDen:.581;
 const attempts=parsed.reduce((z,p)=>z+p.fgaTotal,0);
 const leagueEFG=attempts?parsed.reduce((z,p)=>z+p.made+.5*p.threeMade,0)/attempts:.546;
 for(const p of parsed){
  p.plus=p.ts===null?null:p.ts/leagueTS;
  p.rts=p.ts===null?null:p.ts-100*leagueTS;
  p.efgPlus=p.efg===null?null:p.efg/leagueEFG;
  p.paa=p.tsa?p.points-2*(p.tsa/p.games)*leagueTS:null;
  p.role=p.games&&p.starts!==null?100*p.starts/p.games:null;
  p.qualified=p.games>=5&&p.tsa>=75;
 }
 const players=parsed.map(({made,threeMade,pointsTotal,fgaTotal,ftaTotal,...p})=>({
 ...p,season:"2026-27",ppg:p.points,tsPlus:p.plus,astTo:p.astto,astPct:p.astpct,tovPct:p.tovpct,stlPct:p.stlpct,blkPct:p.blkpct,
 orbPct:p.orb,drbPct:p.drb,trbPct:p.trb}));
 liveCache={players,leagueTS,leagueEFG,source:"BoxScore Lab (CC BY 4.0)",season:"2026-27",updatedAt:new Date().toISOString()};
 liveLoadedAt=Date.now();return liveCache;
}

const KEYS=["ppg","fga","fta","tsa","ts","tsPlus","rts","efg","efgPlus","paa","usage","ast","tov","astTo","astPct","tovPct","stl","blk","stlPct","blkPct","orbPct","drbPct","trbPct","bpm","obpm","dbpm","vorp","ws","per","games","starts","mpg"];
const METRIC_LABELS={ppg:"points per game",tsPlus:"true shooting plus",paa:"points above average scoring efficiency per game",astTo:"assists per turnover",bpm:"box plus/minus",dbpm:"defensive box plus/minus",obpm:"offensive box plus/minus"};
const instructions=`You are HoopMetrics, an intelligent and precise NBA basketball data analyst for the COMPLETE 2025-26 regular season. You have a tool called query_players that executes structured queries over the actual 2025-26 player statistics and get_player for profiles. Whenever the user asks for any numerical NBA 2025-26 player fact, use tools instead of recalling or inventing values. You may call tools multiple times for multi-step questions. Remember conversation context in supplied earlier turns. Explain comparisons and statistical limitations in friendly concise terms. If data is not in tool fields (e.g., defensive matchup tracking, potential assists, 2026-27 season stats, injuries, RAPM, EPM or historical seasons), explicitly say it is unavailable and do not fabricate. TS+ 100 equals league average; high score means efficient but may be driven by low shot creation. Percentiles compare qualified players only unless user requests otherwise (41+ games, 500+ true-shooting attempts), using midranks. For low turnover rate lower is generally preferable, but do not pretend it is a complete ranking. Team uses season team abbreviations; traded players use combined-season records. Assist to turnover ratio uses rounded per-game source inputs. Standard league TS=58.1%, eFG=54.6%. Do not make unsupported claims about causation. The user may ask general basketball questions unrelated to available stats; answer conceptual questions with caveats and say when current evidence is missing. Always identify season and qualification when describing leaderboards.`;
const tools=[{
 type:"function",name:"query_players",description:"Filter, rank and find percentiles for 2025-26 NBA player statistics from the real source data. Use this for analytical or numerical questions.",strict:false,
 parameters:{type:"object",properties:{
 metric:{type:"string",enum:KEYS},sort:{type:"string",enum:["desc","asc"]},limit:{type:"integer",minimum:1,maximum:50},
 qualified:{type:"boolean",description:"True by default for rankings/percentiles. False if user specifically requests every player."},
 position:{type:"string",description:"PG, SG, SF, PF, C, guards, wings, bigs"},
 team:{type:"string",description:"3-letter NBA team abbreviation, optional"},
 role:{type:"string",enum:["all","starter","mostly_starter","hybrid","mostly_bench","bench"]},
 filters:{type:"array",items:{type:"object",properties:{metric:{type:"string",enum:KEYS},op:{type:"string",enum:["gte","lte","eq","gt","lt"]},value:{type:"number"}},required:["metric","op","value"]}},
 percentile_at_least:{type:"number",description:"Only return players whose score is >= this percentile for metric (0-100)"}
 },required:["metric"]}
},{
 type:"function",name:"get_player",description:"Look up a 2025-26 player profile by name, including full available advanced metrics.",
 strict:false,parameters:{type:"object",properties:{name:{type:"string"}},required:["name"]}
}];
const orientLow=new Set(["tovPct","tov"]);
function percentile(data,metric,value){
 const scores=data.map(p=>p[metric]).filter(v=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);
 if(!scores.length)return null;let lower=0,ties=0;
 for(const v of scores){if(v<value-1e-9)lower++;else if(Math.abs(v-value)<1e-9)ties++}
 const pct=100*(lower+ties/2)/scores.length;return Number((orientLow.has(metric)?100-pct:pct).toFixed(1));
}
function answerTool(name,args,players){
 if(name==="get_player"){
  const needle=id(args.name);const p=players.find(p=>id(p.name)===needle)||players.find(p=>id(p.name).includes(needle)&&needle.length>3);
  return p?{player:p}:{error:"No matching 2025-26 player",name:args.name};
 }
 if(name!=="query_players")return {error:"Unknown tool"};
 const metric=KEYS.includes(args.metric)?args.metric:"tsPlus",qual=args.qualified!==false;
 const pool=players.filter(p=>!qual||p.qualified);
 let arr=pool.filter(p=>p[metric]!==null&&Number.isFinite(p[metric]));
 if(args.team)arr=arr.filter(p=>p.team.toLowerCase()===String(args.team).toLowerCase());
 if(args.position){const pos=String(args.position).toUpperCase(),allowed=pos==="GUARDS"?["PG","SG"]:pos==="WINGS"?["SG","SF"]:pos==="BIGS"?["PF","C"]:[pos];arr=arr.filter(p=>p.pos.split(/[\/\-]/).some(x=>allowed.includes(x)))}
 if(args.role&&args.role!=="all"){arr=arr.filter(p=>{const x=p.games?100*p.starts/p.games:0;return args.role==="starter"?x>=80:args.role==="mostly_starter"?x>=50&&x<80:args.role==="hybrid"?x>=20&&x<50:args.role==="mostly_bench"?x>0&&x<20:x===0})}
 if(Array.isArray(args.filters))for(const filter of args.filters.slice(0,12)){if(!KEYS.includes(filter.metric)||!Number.isFinite(filter.value))continue;arr=arr.filter(p=>{const v=p[filter.metric],x=filter.value;if(v===null)return false;return filter.op==="gte"?v>=x:filter.op==="lte"?v<=x:filter.op==="gt"?v>x:filter.op==="lt"?v<x:Math.abs(v-x)<.05})}
 if(Number.isFinite(args.percentile_at_least))arr=arr.filter(p=>percentile(pool,metric,p[metric])>=args.percentile_at_least);
 const sorted=arr.sort((a,b)=>(args.sort==="asc"?a[metric]-b[metric]:b[metric]-a[metric]));
 const limit=Math.min(50,Math.max(1,Number(args.limit)||15));
 return {metric:metric,label:METRIC_LABELS[metric]||metric,qualified:qual,qualification:players.some(p=>p.season==="2026-27")?"5+ games and 75+ estimated true shooting attempts":"41+ games and 500+ estimated season true shooting attempts",total_matches:arr.length,results:sorted.slice(0,limit).map(p=>({name:p.name,team:p.team,pos:p.pos,metric_value:Number(p[metric].toFixed(3)),percentile:percentile(pool,metric,p[metric]),games:p.games,ppg:p.ppg,tsPlus:p.tsPlus,bpm:p.bpm,usage:p.usage}))};
}
function json(res,code,obj,origin=ORIGIN){res.writeHead(code,{"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin,"vary":"Origin","cache-control":"no-store"});res.end(JSON.stringify(obj))}
function readBody(req){return new Promise((resolve,reject)=>{let str="";req.on("data",chunk=>{str+=chunk;if(str.length>12000){reject(Error("Request too large"));req.destroy()}});req.on("end",()=>{try{resolve(JSON.parse(str))}catch{reject(Error("Invalid JSON"))}});req.on("error",reject)})}
async function runChat(message,history,season="2025-26"){
 const live=season==="2026-27";
 const players=live?(await loadLive()).players:await load();
 const guidance=live?instructions.replaceAll("2025-26","2026-27").replace("COMPLETE 2026-27 regular season","IN-PROGRESS 2026-27 regular season").replace("If data is not in tool fields (e.g., defensive matchup tracking, potential assists, 2026-27 season stats, injuries, RAPM, EPM or historical seasons)","If data is not in tool fields (e.g., BPM, defensive matchup tracking, potential assists, injuries, RAPM, EPM or historical seasons)").replaceAll("41+ games, 500+ true-shooting attempts","5+ games, 75+ true-shooting attempts").replace("Standard league TS=58.1%, eFG=54.6%.","League TS+ benchmarks are computed from the 2026-27 source player pool; distinguish from official team totals. Advanced BPM/WS/PER fields are unavailable this season."):instructions;
 const messages=[{role:"system",content:guidance},
 ...history.filter(x=>x&&["user","assistant"].includes(x.role)&&typeof x.content==="string").slice(-10).map(x=>({role:x.role,content:x.content.slice(0,1500)})),
 {role:"user",content:message}];
 const geminiTools=tools.map(t=>({type:"function",function:{name:t.name,description:live?t.description.replaceAll("2025-26","2026-27"):t.description,parameters:t.parameters}}));
 for(let round=0;round<4;round++){
  const response=await client.chat.completions.create({
   model:MODEL,messages,tools:geminiTools,tool_choice:"auto",max_tokens:1400
  });
  const msg=response.choices?.[0]?.message;
  if(!msg)return "The AI provider did not return a response.";
  const calls=msg.tool_calls||[];
  if(!calls.length)return msg.content||"I couldn't generate an answer from the available data.";
  messages.push({role:"assistant",content:msg.content||null,tool_calls:calls});
  for(const call of calls){
   let result;
   try{result=answerTool(call.function.name,JSON.parse(call.function.arguments||"{}"),players)}
   catch(e){result={error:String(e.message)}}
   messages.push({role:"tool",tool_call_id:call.id,content:JSON.stringify(result)});
  }
 }
 return "That question needs more analysis steps than this session permits. Please narrow the request.";
}
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin||"";
 const pathname=new URL(req.url||"/","http://localhost").pathname;
 if(req.method==="OPTIONS"){res.writeHead(204,{"access-control-allow-origin":origin===ORIGIN?ORIGIN:"null","access-control-allow-methods":"POST, GET, OPTIONS","access-control-allow-headers":"Content-Type","vary":"Origin"});res.end();return}
 if(pathname==="/health"&&req.method==="GET")return json(res,200,{ok:true,model:MODEL,aiConfigured:!!client},origin===ORIGIN?ORIGIN:"null");
 if(pathname==="/api/season/2026-27"&&req.method==="GET"){
  if(origin!==ORIGIN)return json(res,403,{error:"Origin not permitted"},"null");
  try{const data=await loadLive();return json(res,200,data,ORIGIN)}
  catch(error){console.error("Season data error:",String(error.message).slice(0,300));return json(res,503,{error:"2026-27 data temporarily unavailable; check server logs."},ORIGIN)}
 }
 if(pathname!=="/api/chat"||req.method!=="POST")return json(res,404,{error:"Not found"},"null");
 if(origin!==ORIGIN)return json(res,403,{error:"Origin not permitted"},"null");
 if(!client)return json(res,503,{error:"AI server not configured. Set GEMINI_API_KEY."},ORIGIN);
 const today=new Date().toISOString().slice(0,10);if(today!==day){day=today;totalCalls=0;traffic.clear()}
 const ip=String(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"anonymous").split(",")[0].trim();
 const bucket=traffic.get(ip)||{count:0,reset:Date.now()+600000};
 if(Date.now()>bucket.reset){bucket.count=0;bucket.reset=Date.now()+600000}
 if(bucket.count>=12||totalCalls>=MAX_DAILY)return json(res,429,{error:"AI request limit reached. Please try later."},ORIGIN);
 bucket.count++;totalCalls++;traffic.set(ip,bucket);
 try{const body=await readBody(req),message=body?.message;
 if(typeof message!=="string"||!message.trim()||message.length>1200)return json(res,400,{error:"Please send a question up to 1200 characters."},ORIGIN);
 const answer=await runChat(message,Array.isArray(body.history)?body.history:[],body.season==="2026-27"?"2026-27":"2025-26");
 return json(res,200,{answer},ORIGIN)
 }catch(error){
  const status=Number(error?.status||error?.code)||500;
  const providerMessage=String(error?.message||"");
  const lower=providerMessage.toLowerCase();
  // Do not leak API credentials, provider request bodies, or user questions to the browser.
  let publicError="The AI provider rejected the request. Check the Render Logs for details.";
  let outStatus=502;
  if(status===401||status===403||/api key not valid|api_key_invalid|permission denied|unauthenticated|api key expired/.test(lower)){
    publicError="Gemini authentication failed. Check GEMINI_API_KEY in Render Environment and redeploy.";outStatus=502;
  }else if(status===429||/quota exceeded|resource exhausted|rate limit/.test(lower)){
    publicError="Gemini free-tier quota or rate limit reached. Check Google AI Studio usage and try later.";outStatus=429;
  }else if(status===404||/model not found|model .* not supported/.test(lower)){
    publicError="Gemini model unavailable. Check GEMINI_MODEL in Render and your API model access.";outStatus=502;
  }else if(status===400||/invalid argument|function calling|tool call|function declaration/.test(lower)){
    publicError="Gemini rejected the request format (model/tool compatibility). Check Render Logs for the provider error.";outStatus=502;
  }else if(/nba source unavailable|fetch failed/.test(lower)){
    publicError="The 2025–26 NBA data source could not be loaded. Retry shortly.";outStatus=503;
  }else if(/timeout|timed out|aborted/.test(lower)){
    publicError="The AI provider or NBA data request timed out. Try again.";outStatus=504;
  }
  console.error("HoopMetrics AI provider failure:",{status,code:error?.code,type:error?.type,message:providerMessage.slice(0,450)});
  return json(res,outStatus,{error:publicError},ORIGIN);
 }
});
server.listen(PORT,"0.0.0.0",()=>console.log("HoopMetrics AI listening on",PORT));
