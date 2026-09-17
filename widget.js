const DOT={Green:"#4caf50",Yellow:"#f4c430",Red:"#e5534b"};
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fmt=d=>String(d.getMonth()+1).padStart(2,"0")+"/"+String(d.getDate()).padStart(2,"0")+"/"+d.getFullYear();
const MENU_ID="138581";

/* clock */
function tick(){
  const n=new Date();
  document.getElementById("clock").textContent=n.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  document.getElementById("date").textContent=n.toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"});
}
tick(); setInterval(tick,15000);

/* lunch rendering */
function renderLunch(items,fetched){
  const box=document.getElementById("lunch");
  if(!fetched){box.innerHTML='<li><span class="msg">Loading\u2026</span></li>';return;}
  if(items===null){box.innerHTML='<li><span class="err">Couldn\'t reach Sage Dining.</span></li>';return;}
  if(!items.length){box.innerHTML='<li><span class="msg">No entr\u00e9es today \u2014 weekend or holiday.</span></li>';return;}
  box.innerHTML=items.map(it=>{
    const color=DOT[it.dot]||"#666";
    const life=(it.allergens&&it.allergens.lifestyleNames||[]).map(t=>'<span class="pill">'+esc(t)+'</span>').join("");
    const st=it.displayStation?'<div class="station">'+esc(it.displayStation)+'</div>':"";
    return '<li><span class="dot" style="background:'+color+'"></span><div><div class="nm">'+esc(it.name)+life+'</div>'+st+'</div></li>';
  }).join("");
}

/* fetch lunch via CORS proxy (used when running outside Chrome extension e.g. GitHub Pages) */
async function fetchLunchDirect(){
  try{
    const sageUrl="https://www.sagedining.com/microsites/getMenuItems?menuId="+MENU_ID+"&date="+fmt(new Date())+"&meal=Lunch&mode=";
    const proxyUrl="https://corsproxy.io/?"+encodeURIComponent(sageUrl);
    const j=await(await fetch(proxyUrl)).json();
    renderLunch(j["Entr\u00e9es"]||j["Entrees"]||[],true);
  }catch(e){renderLunch(null,true);}
}

/* schedule rendering */
function renderSchedule(days){
  const lb=document.getElementById("sched-lessons");
  const hb=document.getElementById("sched-hw");
  if(!days||!days.length){
    lb.innerHTML='<div class="msg">Open the Chrome dashboard tab once to sync.</div>';
    hb.innerHTML='<div class="msg">\u2014</div>';return;
  }
  const today=days.find(d=>d.date===fmt(new Date()));
  if(!today){
    lb.innerHTML='<div class="msg">No classes today.</div>';
    hb.innerHTML='<div class="msg">Nothing due.</div>';return;
  }
  const lr=today.classes.filter(c=>c.title||c.lesson.length||c.assess.length).map(c=>{
    const time=esc(c.start)+(c.end?"\u2013"+esc(c.end):"");
    const title=c.title?'<div class="sched-title">'+esc(c.title)+'</div>':"";
    const lesson=c.lesson.length?'<div class="sched-lesson">'+c.lesson.map(x=>"\u2022 "+esc(x)).join("<br>")+'</div>':"";
    const assess=c.assess.length?'<div class="assess">'+c.assess.map(x=>"\u26a0 "+esc(x)).join("<br>")+'</div>':"";
    return '<div class="sched-row"><div class="sched-time">'+time+'</div><div><div class="sched-name">'+esc(c.name)+'</div>'+title+lesson+assess+'</div></div>';
  }).join("");
  lb.innerHTML=lr||'<div class="msg">No lessons today.</div>';
  const hr=today.classes.filter(c=>c.homework.length).map(c=>
    '<div class="sched-hw-item"><div class="sched-hw-cls">'+esc(c.name)+'</div><div>'+c.homework.map(x=>"\u2022 "+esc(x)).join("<br>")+'</div></div>'
  ).join("");
  hb.innerHTML=hr||'<div class="msg">Nothing due today.</div>';
}

/* fetch schedule.json from GitHub Pages */
async function fetchScheduleFromGitHub(){
  try{
    const url="https://precludetochaos-a11y.github.io/dashboard-widget/schedule.json?t="+Date.now();
    const days=await(await fetch(url)).json();
    renderSchedule(days);
    document.getElementById("stale").textContent="Schedule synced from GitHub";
  }catch(e){
    document.getElementById("sched-lessons").innerHTML='<div class="msg">Open Chrome dashboard tab to sync schedule.</div>';
    document.getElementById("sched-hw").innerHTML='<div class="msg">\u2014</div>';
    document.getElementById("stale").textContent="";
  }
}

/* main loader */
function loadAll(){
  if(typeof chrome!=="undefined"&&chrome.storage){
    chrome.storage.local.get(["lunchItems","lunchSaved","planbookWeek","planbookSaved"],r=>{
      renderLunch(r.lunchItems,"lunchSaved" in r);
      renderSchedule(r.planbookWeek||[]);
      const mins=r.planbookSaved?Math.round((Date.now()-r.planbookSaved)/60000):null;
      document.getElementById("stale").textContent=
        mins===null?"Not synced \u2014 open Chrome dashboard tab once":
        mins<2?"Schedule synced just now":
        "Schedule synced "+mins+" min ago";
      document.getElementById("updated").textContent=
        "updated "+new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
    });
  }else{
    fetchLunchDirect();
    fetchScheduleFromGitHub();
    document.getElementById("updated").textContent=
      "updated "+new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  }
}
loadAll();
setInterval(loadAll,30*60*1000);
