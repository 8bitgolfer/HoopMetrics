"use strict";
const URL_BASE="https://raw.githubusercontent.com/Baileyd18/NBA-Player-Impact-and-Value-Dashboard-2025-26/main/Data/";
const LEAGUE_TS=.581,LEAGUE_EFG=.546,PER_PAGE=35;
const $=id=>document.getElementById(id);
const val=(v)=>v===undefined||v===null||v===""?null:(Number.isFinite(Number(v))?Number(v):null);
const n=(v)=>val(v)??0;
const f=(v,d=1)=>v===null||!Number.isFinite(v)?"—":Number(v).toFixed(d);
const norm=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const total=t=>/^(?:[2-9]TM|TOT)$/.test(String(t));
const category={
 scoring:[["points","PPG",1],["ts","TS%",1],["plus","TS+",1],["rts","rTS (pp)",1],["efg","eFG%",1],["efgPlus","eFG+",1],["paa","PAA / G",2],["tsa","TSA (season)",0],["fga","FGA / G",1],["usage","USG%",1]],
 playmaking:[["ast","APG",1],["astpct","AST%",1],["astto","AST/TO",2],["tovpct","TOV%",1],["tov","TOV / G",1],["usage","USG%",1],["ftr","FT rate",3],["threepar","3PA rate",3]],
 defense:[["stlpct","STL%",1],["blkpct","BLK%",1],["dbpm","DBPM",1],["orb","ORB%",1],["drb","DRB%",1],["trb","TRB%",1],["stl","Steals / G",1],["blk","Blocks / G",1],["dws","Def. win shares",1]],
 impact:[["bpm","BPM",1],["obpm","OBPM",1],["dbpm","DBPM",1],["vorp","VORP",1],["ws","Win shares",1],["ws48","WS/48",3],["ows","Off. win shares",1],["dws","Def. win shares",1],["per","PER",1]]
};
const METRICS={
 points:{label:"Points per game",suffix:" PPG"},ts:{label:"True shooting percentage",suffix:"%"},plus:{label:"True Shooting Plus (TS+)"},rts:{label:"Relative TS",suffix:" pp"},efg:{label:"Effective field goal percentage",suffix:"%"},efgPlus:{label:"Effective field goal plus"},paa:{label:"Points above average efficiency",suffix:" per game"},tsa:{label:"Season true shooting attempts"},fga:{label:"Field-goal attempts per game"},usage:{label:"Usage rate",suffix:"%"},
 ast:{label:"Assists per game"},astpct:{label:"Assist percentage",suffix:"%"},astto:{label:"Assist to turnover ratio"},tovpct:{label:"Turnover percentage",suffix:"%"},tov:{label:"Turnovers per game"},
 ftr:{label:"Free throw attempt rate"},threepar:{label:"Three-point attempt rate"},
 stlpct:{label:"Steal percentage",suffix:"%"},blkpct:{label:"Block percentage",suffix:"%"},dbpm:{label:"Defensive box plus/minus"},orb:{label:"Offensive rebound percentage",suffix:"%"},drb:{label:"Defensive rebound percentage",suffix:"%"},trb:{label:"Total rebound percentage",suffix:"%"},stl:{label:"Steals per game"},blk:{label:"Blocks per game"},dws:{label:"Defensive win shares"},
 bpm:{label:"Box plus/minus"},obpm:{label:"Offensive box plus/minus"},vorp:{label:"Value over replacement player"},ws:{label:"Win shares"},ws48:{label:"Win shares per 48 minutes"},ows:{label:"Offensive win shares"},per:{label:"Player efficiency rating"}
};
const LOW_BETTER=new Set(["tov","tovpct"]); // lower TOV% is favorable but not a stand-alone impact ranking
const state={players:[],eligible:[],filtered:[],sort:"plus",desc:true,cat:"scoring",page:0,loading:true,columns:{}};
function parseCSV(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"')quoted=false;else cell+=ch}
 else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell=""}else if(ch==='\n'){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}else cell+=ch}
 if(cell||row.length){row.push(cell);rows.push(row)}
 const header=rows.shift()||[];return rows.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));
}
function uniqueSeason(rows){
 const map=new Map();
 for(const r of rows){const name=(r.Player||"").replace(/\*/g,"").trim();if(!name)continue;const id=norm(name),g=n(r.G),team=r.Team||"";
 const old=map.get(id);
 if(!old||(total(team)&&!total(old.Team))||(total(team)===total(old.Team)&&g>n(old.G)))map.set(id,r);
 }return map;
}
function buildPlayers(per,adv){
 const advanced=uniqueSeason(adv); const map=uniqueSeason(per);const players=[];
 for(const [id,row] of map){
  const a=advanced.get(id)||{};
  const games=n(row.G),pts=n(row.PTS),fga=n(row.FGA),fta=n(row.FTA),tsaPer=fga+.44*fta;
  const sourceTS=val(a["TS%"]),ts=sourceTS??(tsaPer>0?pts/(2*tsaPer):null);
  const efgr=val(row["eFG%"]);
  const tov=n(row.TOV),ast=n(row.AST);
  const p={
   id,name:(row.Player||"").replace(/\*/g,"").trim(),team:row.Team||"",pos:row.Pos||"",age:val(row.Age),games,starts:n(row.GS),mpg:n(row.MP),
   points:pts,fga,fta,ast,tov,stl:n(row.STL),blk:n(row.BLK),
   ts:ts===null?null:ts*100,plus:ts===null?null:100*ts/LEAGUE_TS,
   rts:ts===null?null:100*(ts-LEAGUE_TS),
   efg:efgr===null?null:100*efgr,efgPlus:efgr===null?null:100*efgr/LEAGUE_EFG,
   tsa:games*tsaPer,paa:tsaPer?pts-2*tsaPer*LEAGUE_TS:null,
   astto:tov>0?ast/tov:null,
   usage:val(a["USG%"]),astpct:val(a["AST%"]),tovpct:val(a["TOV%"]),
   ftr:val(a["FTr"]),threepar:val(a["3PAr"]),
   stlpct:val(a["STL%"]),blkpct:val(a["BLK%"]),orb:val(a["ORB%"]),drb:val(a["DRB%"]),trb:val(a["TRB%"]),
   bpm:val(a.BPM),obpm:val(a.OBPM),dbpm:val(a.DBPM),vorp:val(a.VORP),
   ws:val(a.WS),ws48:val(a["WS/48"]),ows:val(a.OWS),dws:val(a.DWS),per:val(a.PER)
  };
  p.role=p.games?100*p.starts/p.games:0;p.qualified=p.games>=41&&p.tsa>=500;
  players.push(p)
 }
 state.players=players;state.eligible=players.filter(p=>p.qualified);populateSelectors();renderAll();
}
function percentile(metric,value){
 if(value===null||!Number.isFinite(value))return null;
 const vals=state.eligible.map(p=>p[metric]).filter(v=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);
 if(vals.length<2)return null;
 // Midrank percentile handles ties; qualifying population and direction shown in methodology.
 let less=0,equal=0;for(const x of vals){if(x<value-1e-9)less++;else if(Math.abs(x-value)<1e-9)equal++}
 const fraction=(less+equal/2)/vals.length;return 100*(LOW_BETTER.has(metric)?1-fraction:fraction);
}
function renderAll(){state.loading=false;filter();renderMethods();fillDatalist();renderColumnOptions();}
function populateSelectors(){
 const team=$("team");for(const t of [...new Set(state.players.map(p=>p.team))].sort()){const opt=document.createElement("option");opt.value=t;opt.textContent=t;team.appendChild(opt)}
}
function posMatch(p,v){if(!v)return true;const positions=p.pos.split(/[-/]/);if(v==="guards")return positions.some(x=>["PG","SG"].includes(x));if(v==="wings")return positions.some(x=>["SG","SF"].includes(x));if(v==="bigs")return positions.some(x=>["PF","C"].includes(x));return positions.includes(v)}
function roleMatch(p,v){if(!v)return true;const r=p.role;return v==="full"?r>=80:v==="mostly"?r>=50&&r<80:v==="hybrid"?r>=20&&r<50:v==="mostlybench"?r>0&&r<20:r===0}
function customCompare(value,str,op){if(!str)return true;if(value===null)return false;const x=Number(str);return op==="lte"?value<=x+1e-9:op==="eq"?Math.abs(value-x)<.05:value>=x-1e-9}
function filter(){
 const q=norm($("search").value),team=$("team").value,pos=$("position").value,role=$("role").value,
 minGames=n($("games").value),minTsa=n($("tsa").value),ppg=$("ppg").value,usage=$("usage").value;
 const customPpg=$("ppgToggle").getAttribute("aria-pressed")==="true",customUsage=$("usageToggle").getAttribute("aria-pressed")==="true";
 const [lo,hi]=(usage||"0:999").split(":").map(Number);
 state.filtered=state.players.filter(p=>{
  if(q&&!norm(p.name+" "+p.team).includes(q))return false;
  if(team&&p.team!==team||!posMatch(p,pos)||!roleMatch(p,role)||p.games<minGames||p.tsa<minTsa)return false;
  if(customPpg?!customCompare(p.points,$("ppgExact").value,$("ppgOp").value):(ppg!==""&&p.points<Number(ppg)))return false;
  if(customUsage?!customCompare(p.usage,$("usageExact").value,$("usageOp").value):(usage!==""&&(p.usage===null||p.usage<lo||p.usage>=hi)))return false;
  return true
 });
 state.filtered.sort((a,b)=>{const av=a[state.sort],bv=b[state.sort];if(av==null)return 1;if(bv==null)return -1;
 const diff=typeof av==="string"?av.localeCompare(bv):av-bv;return state.desc?-diff:diff});
 state.page=0;renderTable();
}

const METRIC_HELP={
 plus:"True Shooting Plus: 100 equals NBA league average; 110 means 10% more efficient relative to league TS%.",
 ts:"True Shooting Percentage measures scoring efficiency across field goals and free throws.",
 rts:"Relative TS: the player's true shooting percentage minus league average, in percentage points.",
 efgPlus:"Effective field goal percentage relative to NBA average. 100 is league average.",
 paa:"Estimated points per game above league-average efficiency given similar shooting opportunities.",
 astpct:"Estimated share of teammate field goals assisted while a player is on court.",
 astto:"Assists divided by turnovers. Higher indicates more assists per turnover.",
 usage:"Estimated share of team possessions used by a player on the court.",
 tovpct:"Percentage of a player's used offensive possessions ending in a turnover.",
 bpm:"Box Plus/Minus estimates overall player impact using a box-score model per 100 possessions.",
 obpm:"Offensive Box Plus/Minus estimates offensive contribution using a box-score model.",
 dbpm:"Defensive Box Plus/Minus is a box-score-based defensive estimate, not a complete defensive assessment.",
 vorp:"Value Over Replacement Player: cumulative player value derived from BPM and playing time.",
 stlpct:"Estimated percentage of opponent possessions resulting in a steal by the player.",
 blkpct:"Estimated percentage of opponent two-point shots blocked by the player.",
 orb:"Estimated percentage of available offensive rebounds secured.",
 drb:"Estimated percentage of available defensive rebounds secured."
};
function showMetricHelp(k){const meta=METRICS[k];if(!meta)return;const box=$("metricToast");if(!box)return;box.textContent=METRIC_HELP[k]||meta.label+": see About stats for calculation details.";box.classList.add("visible");clearTimeout(showMetricHelp.timer);showMetricHelp.timer=setTimeout(()=>box.classList.remove("visible"),6500)}
function renderColumnOptions(){const cols=category[state.cat],chosen=state.columns[state.cat]??cols.slice(0,4).map(c=>c[0]);$("columnsOptions").innerHTML=cols.map(([k,label])=>"<label class='column-choice'><input type='checkbox' data-column='"+safe(k)+"' "+(chosen.includes(k)?"checked":"")+"><span>"+safe(label)+"</span></label>").join("");$("columnsOptions").querySelectorAll("input").forEach(input=>input.onchange=()=>{const old=state.columns[state.cat]??cols.slice(0,4).map(c=>c[0]);const next=input.checked?[...old,input.dataset.column]:old.filter(x=>x!==input.dataset.column);if(!next.length){input.checked=true;return}state.columns[state.cat]=next;renderTable()})}

function renderTable(){
 const cols=category[state.cat],thead=$("tableHead"),tbody=$("tableBody");
 const chosen=state.columns[state.cat]??cols.slice(0,4).map(c=>c[0]);const headers=[["name","PLAYER"],["team","TEAM"],["games","GP"],...cols.filter(c=>chosen.includes(c[0])).map(c=>[c[0],c[1]])];
 thead.innerHTML="<tr>"+headers.map(([k,label])=>"<th data-sort='"+safe(k)+"'>"+safe(label)+(METRICS[k]?" <button type=\'button\' class=\'metric-help\' data-help=\'"+safe(k)+"\' aria-label=\'Explain "+safe(label)+"\'>ⓘ</button>":"")+(state.sort===k?(state.desc?" ↓":" ↑"):"")+"</th>").join("")+"</tr>";
 thead.querySelectorAll("th").forEach(th=>th.onclick=e=>{if(e.target.closest(".metric-help"))return;const k=th.dataset.sort;state.desc=state.sort===k?!state.desc:!["name","team"].includes(k);state.sort=k;filter()});thead.querySelectorAll(".metric-help").forEach(b=>b.onclick=e=>{e.stopPropagation();showMetricHelp(b.dataset.help)});
 const start=state.page*PER_PAGE;const display=state.filtered.slice(start,start+PER_PAGE);
 tbody.innerHTML=display.map(p=>"<tr>"+headers.map(([k])=>{
  let value=k==="name"?"<a href='#' data-profile='"+safe(p.id)+"'>"+safe(p.name)+"</a>":k==="team"?safe(p.team):k==="games"?p.games:metricText(k,p[k],true);
  let cls=(k==="plus"||k==="efgPlus")?(p[k]!=null?(p[k]>=100?"good":"bad"):""):"";
  return "<td class='"+cls+"'>"+value+"</td>"
 }).join("")+"</tr>").join("")||"<tr><td colspan='"+headers.length+"' style='text-align:center;padding:36px'>No matching players. Try clearing filters.</td></tr>";
 tbody.querySelectorAll("[data-profile]").forEach(a=>a.onclick=e=>{e.preventDefault();openProfile(a.dataset.profile)});
 $("resultsCount").textContent=state.filtered.length.toLocaleString()+" MATCHES";
 $("tableStatus").textContent=state.filtered.length?"Showing "+(start+1)+"–"+Math.min(start+PER_PAGE,state.filtered.length)+" of "+state.filtered.length:"No players match";
 $("pageLabel").textContent=(state.page+1)+" / "+Math.max(1,Math.ceil(state.filtered.length/PER_PAGE));
 $("prev").disabled=state.page===0;$("next").disabled=(state.page+1)*PER_PAGE>=state.filtered.length;
}
function metricText(k,v,html=false){
 if(v===null||!Number.isFinite(v))return "—";
 let places=k==="tsa"?0:(k==="ws48"||k==="ftr"||k==="threepar")?3:(k==="paa"||k==="astto")?2:1;
 let out=f(v,places);
 if(["ts","efg","usage","astpct","tovpct","stlpct","blkpct","orb","drb","trb"].includes(k))out+="%";
 if(k==="rts")out+=(v>=0? " pp":" pp");
 return html?safe(out):out;
}
function renderMethods(){
 const blocks=[
 ["TS% and TS+","TS% = PTS / (2 × (FGA + 0.44 × FTA)). TS+ = 100 × (player TS% / 0.581).","TS% uses published advanced-data season rates where available. League TS% was 58.1% in 2025–26."],
 ["rTS% / eFG+","rTS = player TS% − 58.1 percentage points. eFG% = (FGM + 0.5 × 3PM) / FGA. eFG+ = 100 × player eFG% / 0.546.","NBA league eFG% = 54.6% in 2025–26. eFG is from the per-game CSV source."],
 ["PAA / game","PAA = PPG − 2 × (FGA/G + 0.44 × FTA/G) × league TS%.","Scoring points above average efficiency for equivalent approximate true shooting attempts; not total offensive value. Calculated using rounded per-game input."],
 ["Usage and creation","USG%, AST%, AST/TO (assists ÷ turnovers), TOV%, 3PAr, and FTr.","AST% and USG% are published advanced measures. Shot creation is not directly observable from the current data; 3PAr, FTr and usage are profile context, not a made-up tracking score."],
 ["Defense","STL%, BLK%, ORB%, DRB%, TRB%, DBPM, DWS.","DBPM and DWS are model-based box-score metrics. Steals, blocks and rebounds don't capture all defense. Rim deterrence, on/off, and tracking defense are not available in this source."],
 ["Impact","BPM, OBPM, DBPM, VORP, WS, WS/48, PER.","These are published advanced estimates, not newly calculated composite grades. They measure different concepts and should not be averaged into a single invented rating."],
 ["Percentile qualification","Games ≥ 41 and estimated season TSA ≥ 500. Midrank = 100 × (count below + 0.5 × count tied) / N.","Percentiles compare qualified players, not all players, and are not position-adjusted. Low turnover rate is reversed for percentile direction only; this should not be treated as a total skill ranking."],
 ["Sources & limitations","2025–26 Basketball-Reference-style per-game and advanced CSV datasets from a public NBA analytics repository.","The data is loaded on the browser at runtime and relies on the upstream repository. Traded players use combined-season rows where present. Rounded per-game values cause slight precision differences. No licensed or private tracking stats are invented."],
 ["Conversation assistant","Statistical question parsing and database lookup run entirely in your browser.","Supports common questions about ranking, percentiles, positions, roles, and two-player comparisons. Not a generative AI or open-ended reasoning model; a secure server-side LLM integration is needed for that."]
 ];
 $("methodContent").innerHTML=blocks.map(([title,formula,desc])=>"<div class='method-card'><h3>"+safe(title)+"</h3><code>"+safe(formula)+"</code><p>"+safe(desc)+"</p></div>").join("")+"<div class='method-card'><h3>Original datasets</h3><p><a href='https://github.com/Baileyd18/NBA-Player-Impact-and-Value-Dashboard-2025-26/tree/main/Data' target='_blank' rel='noopener'>Player data repository ↗</a><br><a href='https://www.basketball-reference.com/leagues/NBA_stats_per_game.html' target='_blank' rel='noopener'>2025–26 league benchmarks ↗</a><br><a href='https://www.basketball-reference.com/about/glossary.html' target='_blank' rel='noopener'>Statistical glossary ↗</a></p></div>";
}
function openProfile(id){
 const p=state.players.find(x=>x.id===id);if(!p)return;
 const groups=[
 ["SCORING",["plus","ts","rts","efgPlus","paa","points","usage"]],
 ["PLAYMAKING",["astpct","astto","tovpct","ast"]],
 ["DEFENSE",["stlpct","blkpct","dbpm","drb","orb"]],
 ["IMPACT",["bpm","obpm","dbpm","vorp"]]];
 const summary="<div class='profile-main'><h2 class='profile-name'>"+safe(p.name)+"</h2><div class='profile-sub'>"+safe(p.team)+" · "+safe(p.pos)+" · "+p.games+" GP · "+p.starts+" starts · "+f(p.mpg)+" MPG</div><div class='profile-stats'>"+[["PPG",metricText("points",p.points)],["TS+",metricText("plus",p.plus)],["BPM",metricText("bpm",p.bpm)]].map(([label,value])=>"<div class='mini-stat'><label>"+label+"</label><strong>"+value+"</strong></div>").join("")+"</div>";
 const details=groups.map(([title,keys],i)=>"<details class='profile-section' "+(i===0?"open":"")+"><summary>"+title+" <span>"+keys.length+" stats ▾</span></summary><div class='profile-section-body'>"+keys.map(k=>{const pct=percentile(k,p[k]);return "<div class='metric-bar'><div class='metric-label'><b>"+safe(METRICS[k].label)+" <span>"+metricText(k,p[k])+"</span></b><span>"+(pct===null?"n/a":f(pct,0)+"th pct")+"</span></div><div class='bar-track'><div class='bar-fill' style='width:"+(pct===null?0:pct)+"%'></div></div></div>"}).join("")+"</div></details>").join("");
 $("profileContent").innerHTML=summary+details+"<div class='profile-foot'>Percentiles use qualified 2025–26 players (41+ GP, 500+ estimated TSA). Box-score defense and BPM have important limitations.</div></div>";
 $("drawerBackdrop").classList.remove("hidden");$("profileDrawer").classList.remove("hidden");document.body.style.overflow="hidden";
}
function closeProfile(){$("drawerBackdrop").classList.add("hidden");$("profileDrawer").classList.add("hidden");document.body.style.overflow=""}
function fillDatalist(){$("playerOptions").innerHTML=state.players.map(p=>"<option value='"+safe(p.name)+"'></option>").join("")}
function lookup(name){const q=norm(name);return state.players.find(p=>norm(p.name)===q)||state.players.find(p=>norm(p.name).includes(q)&&q.length>=4)}
function comparePlayers(a,b){const keys=["points","plus","rts","efgPlus","paa","usage","astpct","astto","tovpct","stlpct","blkpct","dbpm","bpm","vorp","drb"];
 const head="<div class='comparison-head'><div><strong>"+safe(a.name)+"</strong><small>"+safe(a.team)+" · "+safe(a.pos)+"</small></div><div><strong>"+safe(b.name)+"</strong><small>"+safe(b.team)+" · "+safe(b.pos)+"</small></div></div>";
 const rows=keys.map(k=>{const av=a[k],bv=b[k],win=av===null||bv===null?0:(av===bv?0:(av>bv?1:2));const reverse=LOW_BETTER.has(k);const aWin=win===(reverse?2:1),bWin=win===(reverse?1:2);return "<tr><td class='"+(aWin?"win":"")+"'>"+metricText(k,av)+"</td><td>"+safe(METRICS[k].label)+"</td><td class='"+(bWin?"win":"")+"'>"+metricText(k,bv)+"</td></tr>"}).join("");
 return head+"<div class='table-scroll'><table class='comparison-table'><thead><tr><th>"+safe(a.name)+"</th><th>METRIC</th><th>"+safe(b.name)+"</th></tr></thead><tbody>"+rows+"</tbody></table></div><p class='compare-note'>Green highlights indicate favorable raw comparisons (not a composite player rating). Different roles, minutes, teammates and statistical uncertainty matter.</p>";
}
function navigate(view){document.querySelectorAll(".view").forEach(e=>e.classList.toggle("active",e.id==="view-"+view));document.querySelectorAll(".navitem").forEach(e=>e.classList.toggle("selected",e.dataset.view===view));window.scrollTo(0,0)}
function resetFilters(){
 $("search").value="";$("team").value="";$("position").value="";$("role").value="";$("games").value="41";$("tsa").value="0";$("ppg").value="";$("usage").value="";
 for(const x of ["ppg","usage"]){$(x+"Exact").value="";$(x+"Op").value="gte";$(x+"Toggle").setAttribute("aria-pressed","false");$(x+"Custom").classList.add("hidden");$(x).disabled=false}
 filter();
}
function exportData(){
 const columns=["name","team","pos","games","starts","mpg",...category[state.cat].map(c=>c[0])];
 const csv=[columns.join(","),...state.filtered.map(p=>columns.map(k=>'"'+String(p[k]??"").replace(/"/g,'""')+'"').join(","))].join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="hoopmetrics-2025-26-"+state.cat+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function guessMetric(q){
 if(/assist.{0,12}turnover|ast\s*\/\s*to|ast.to|passing efficiency/.test(q))return "astto";
 if(/turnover percent|turnover rate|tov%/.test(q))return "tovpct";
 if(/offensive.{0,9}box|obpm/.test(q))return "obpm";
 if(/defensive.{0,9}box|dbpm|defensive bpm/.test(q))return "dbpm";
 if(/box plus|\bbpm\b|overall impact/.test(q))return "bpm";
 if(/vorp|replacement/.test(q))return "vorp";
 if(/win shares per|ws\/48/.test(q))return "ws48";
 if(/win share/.test(q))return "ws";
 if(/rebound percentage|drb%/.test(q))return "drb";
 if(/steal percentage|stl%/.test(q))return "stlpct";
 if(/block percentage|blk%/.test(q))return "blkpct";
 if(/assist percentage|ast%/.test(q))return "astpct";
 if(/assists|playmaking/.test(q))return "ast";
 if(/relative true|rts/.test(q))return "rts";
 if(/efg\+|effective field goal plus/.test(q))return "efgPlus";
 if(/effective field goal|efg/.test(q))return "efg";
 if(/points above|\bpaa\b|scoring surplus/.test(q))return "paa";
 if(/usage|usg/.test(q))return "usage";
 if(/scoring efficiency|true shooting|ts\+|efficient scor|efficiency/.test(q))return "plus";
 if(/points per game|\bppg\b|top scorers|scoring leaders/.test(q))return "points";
 if(/steals/.test(q))return "stl";
 if(/blocks/.test(q))return "blk";
 return null;
}
function chatAnswer(raw){
 const q=raw.toLowerCase().replace(/dončić/g,"doncic");
 const metric=guessMetric(q);
 const pos=/point guards?|\bpg\b/.test(q)?"PG":/shooting guards?|\bsg\b/.test(q)?"SG":/small forwards?|\bsf\b/.test(q)?"SF":/power forwards?|\bpf\b/.test(q)?"PF":/centers?|\bcenter\b/.test(q)?"C":/guards?/.test(q)?"guards":/wings?/.test(q)?"wings":/bigs?/.test(q)?"bigs":"";
 const qual=/all players|no minimum|unqualified|including everyone/.test(q)?false:true;
 const m=metric||"plus";
 let players=(qual?state.eligible:state.players).filter(p=>p[m]!==null&&(!pos||posMatch(p,pos)));
 const teamMatch=state.players.find(p=>q.includes(p.team.toLowerCase())&&p.team.length>=3);
 if(/\bteam\s+(?:is\s+)?[a-z]{3}\b/.test(q)&&teamMatch)players=players.filter(p=>p.team===teamMatch.team);
 const candidates=state.players.filter(p=>norm(q).includes(p.id)&&p.id.length>4).sort((a,b)=>b.id.length-a.id.length);
 const distinct=[...new Map(candidates.map(p=>[p.id,p])).values()];
 if(/compare|versus|\bvs\b|difference between/.test(q)&&distinct.length>=2){
  const a=distinct[0],b=distinct[1];
  if(metric)return a.name+": "+metricText(m,a[m])+" ("+METRICS[m].label+")\n"+b.name+": "+metricText(m,b[m])+".\nDifference: "+(a[m]==null||b[m]==null?"not available":f(Math.abs(a[m]-b[m]),2))+" in the metric's displayed units.";
  return a.name+": TS+ "+metricText("plus",a.plus)+", BPM "+metricText("bpm",a.bpm)+", AST% "+metricText("astpct",a.astpct)+".\n"+b.name+": TS+ "+metricText("plus",b.plus)+", BPM "+metricText("bpm",b.bpm)+", AST% "+metricText("astpct",b.astpct)+".";
 }
 const pctMatch=q.match(/(\d+(?:\.\d+)?)\s*(?:st|nd|rd|th)?\s*(?:\+|percentile|%ile)/);
 const threshold=q.match(/(?:above|over|at least|greater than|more than)\s*(\d+(?:\.\d+)?)/);
 let pct=null;if(pctMatch&&/percentile|%ile|top\s*\d+\s*%/.test(q))pct=Number(pctMatch[1]);
 const topPct=q.match(/top\s*(\d+(?:\.\d+)?)\s*%/);if(topPct)pct=100-Number(topPct[1]);
 if(pct!==null){if(pct<0||pct>100)return "Please use a percentile between 0 and 100.";
  players=players.filter(p=>{const r=percentile(m,p[m]);return r!==null&&r>=pct});
 }
 if(threshold&&pct===null)players=players.filter(p=>p[m]>=Number(threshold[1]));
 if(distinct.length===1&&/(what|how|tell me|stats|percentile)/.test(q)){
  const p=distinct[0],r=percentile(m,p[m]);
  return p.name+" ("+p.team+") — "+METRICS[m].label+": "+metricText(m,p[m])+"."+ (r===null?"":" This is approximately the "+f(r,1)+"th percentile among qualified 2025–26 players.")+"\nOther context: "+f(p.points)+" PPG, "+f(p.usage)+"% USG, "+f(p.bpm)+" BPM.";
 }
 const top=(q.match(/top\s*(\d{1,2})\b/)||[])[1];let max=top?Math.min(30,Number(top)):(pct!==null?Math.min(30,players.length):10);
 const ascending=/lowest|worst|least|bottom/.test(q);
 players.sort((a,b)=>LOW_BETTER.has(m)?(ascending?b[m]-a[m]:a[m]-b[m]):(ascending?a[m]-b[m]:b[m]-a[m]));
 if(!players.length)return "No eligible 2025–26 players matched that request. Try removing the position requirement or asking about a different metric.";
 const suffix=pct!==null?" at or above the "+pct+"th percentile":"";
 const title=METRICS[m].label+suffix+" ("+players.length+" matching player"+(players.length===1?"":"s")+")";
 const lines=players.slice(0,max).map((p,i)=>(i+1)+". "+p.name+" ("+p.team+", "+p.pos+") — "+metricText(m,p[m])+(pct!==null?" · "+f(percentile(m,p[m]),0)+"th pct":""));
 return title+"\n"+lines.join("\n")+"\n\n"+(qual?"Qualified pool: 41+ games and 500+ estimated true shooting attempts.":"No games/attempt qualification applied.")+"\nYou can ask for a different position, metric, percentile, or 'top 20'.";
}
// Render only a small, safe subset of Markdown; all model text is HTML-escaped first.
function renderChatMarkdown(text){
 const escaped=safe(String(text??"")).replace(/\r\n?/g,"\n");
 return escaped
  .replace(/\*\*([\s\S]*?)\*\*/g,(_,value)=>"<strong>"+value+"</strong>")
  .replace(/(^|[^\w*])\*([^*\n]+)\*(?=$|[^\w*])/gm,(_,prefix,value)=>prefix+"<em>"+value+"</em>")
  .replace(/`([^`\n]+)`/g,(_,value)=>"<code>"+value+"</code>");
}
function addBubble(txt,who){
 const b=document.createElement("div");
 b.className="bubble "+who;
 if(who==="bot")b.innerHTML=renderChatMarkdown(txt);
 else b.textContent=txt;
 $("chatLog").appendChild(b);
 $("chatLog").scrollTop=$("chatLog").scrollHeight;
}
const chatHistory=[];
let asking=false;
async function ask(q){
 if(!q.trim()||asking)return;
 const backend=(window.HOOPMETRICS_AI_API||"").trim().replace(/\/$/,"");
 const history=chatHistory.slice(-10);
 addBubble(q,"user");asking=true;
 const submit=$("chatForm").querySelector("button[type=submit]");if(submit)submit.disabled=true;
 try{
  let answer;
  if(backend){
   const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
   try{
    const response=await fetch(backend+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q,history}),signal:controller.signal});
    const data=await response.json();if(!response.ok)throw Error(data.error||"AI server unavailable");answer=data.answer;
   }finally{clearTimeout(timeout)}
  }else{
   if(state.loading)throw Error("Player data is still loading");
   answer=chatAnswer(q);
  }
  addBubble(answer,"bot");chatHistory.push({role:"user",content:q},{role:"assistant",content:answer});
  if(chatHistory.length>24)chatHistory.splice(0,chatHistory.length-24);
 }catch(err){
  addBubble((backend?"AI server error: ":"Stats assistant error: ")+err.message+(backend?" Check your Render backend and API settings.":""),"bot");
 }finally{asking=false;if(submit)submit.disabled=false}
}
async function checkAiStatus(){
 const endpoint=(window.HOOPMETRICS_AI_API||"").trim().replace(/\/$/,"");
 const status=$("aiStatus");
 if(!endpoint){status.textContent="STATS MODE";return}
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),13000);
 try{
  const response=await fetch(endpoint+"/health",{signal:controller.signal,cache:"no-store"});
  if(!response.ok)throw Error("Health check failed");
  const result=await response.json();
  status.textContent=result.aiConfigured?"AI READY":"AI KEY MISSING";
  status.title=result.aiConfigured?"Backend is configured; ask a question to test the Gemini service.":"Set GEMINI_API_KEY in Render and redeploy.";
 }catch(e){
  status.textContent="AI OFFLINE";
  status.title="Could not reach the Render AI backend. Check deployment status or try again after the service starts.";
 }finally{clearTimeout(timer)}
}
function boot(){
 // Remove legacy suggestion chips even if cached HTML still contains them.
 const legacyPrompts=document.getElementById("prompts");
 if(legacyPrompts)legacyPrompts.remove();
 $("aiStatus").textContent="CHECKING AI";
 checkAiStatus();
 document.querySelectorAll(".navitem").forEach(b=>b.onclick=()=>navigate(b.dataset.view));
 $("floatingChat").onclick=()=>navigate("assistant");
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));state.cat=b.dataset.cat;state.sort=category[state.cat][0][0];state.desc=true;renderColumnOptions();filter()});
 ["search","team","position","role","games","tsa","ppg","usage","ppgExact","usageExact","ppgOp","usageOp"].forEach(id=>$(id).addEventListener(["search","ppgExact","usageExact"].includes(id)?"input":"change",filter));
 for(const id of ["ppg","usage"])$(id+"Toggle").onclick=()=>{const on=$(id+"Toggle").getAttribute("aria-pressed")!=="true";$(id+"Toggle").setAttribute("aria-pressed",String(on));$(id+"Custom").classList.toggle("hidden",!on);$(id).disabled=on;filter()};
 $("resetFilters").onclick=resetFilters;$("export").onclick=exportData;
 $("advancedToggle").onclick=()=>{const open=$("advancedToggle").getAttribute("aria-expanded")!=="true";$("advancedToggle").setAttribute("aria-expanded",String(open));$("advancedChevron").textContent=open?"▴":"▾";document.querySelector(".filter-shelf").classList.toggle("advanced-open",open)};
 $("columnsToggle").onclick=()=>{const open=$("columnsToggle").getAttribute("aria-expanded")!=="true";$("columnsToggle").setAttribute("aria-expanded",String(open));$("columnsPanel").classList.toggle("hidden",!open)};
 $("columnsReset").onclick=()=>{delete state.columns[state.cat];renderColumnOptions();renderTable()};
 $("prev").onclick=()=>{if(state.page>0){state.page--;renderTable()}};
 $("next").onclick=()=>{if((state.page+1)*PER_PAGE<state.filtered.length){state.page++;renderTable()}};
 $("closeDrawer").onclick=closeProfile;$("drawerBackdrop").onclick=closeProfile;
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeProfile()});
 $("compareBtn").onclick=()=>{const a=lookup($("playerA").value),b=lookup($("playerB").value);$("compareResults").innerHTML=!a||!b?"<div class='empty-state'>Choose two valid names from the suggestions.</div>":a.id===b.id?"<div class='empty-state'>Choose two different players.</div>":comparePlayers(a,b)};
 $("chatForm").onsubmit=e=>{e.preventDefault();const q=$("chatInput").value;$("chatInput").value="";ask(q)};
 document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>ask(b.dataset.prompt));
 Promise.all(["raw_per_game.csv","raw_advanced.csv"].map(path=>fetch(URL_BASE+path).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.text()}))).then(([per,adv])=>buildPlayers(parseCSV(per),parseCSV(adv))).catch(err=>{$("tableStatus").textContent="Couldn't load player data: "+err.message;$("resultsCount").textContent="DATA ERROR";$("chatLog").textContent="Unable to load season data. Check the source CSV availability and reload."});
}
boot();
