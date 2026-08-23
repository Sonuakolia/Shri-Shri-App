
const $=s=>document.querySelector(s);
const state={videos:[],user:null,subs:JSON.parse(localStorage.getItem("ss_subs")||"[]"),history:JSON.parse(localStorage.getItem("ss_hist")||"[]"),likes:JSON.parse(localStorage.getItem("ss_likes")||"[]")};

function openDB(){
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open("ShriShriDB",1);
  r.onupgradeneeded=e=>{
   const db=e.target.result;
   if(!db.objectStoreNames.contains("videos")) db.createObjectStore("videos",{keyPath:"id"});
   if(!db.objectStoreNames.contains("users")) db.createObjectStore("users",{keyPath:"email"});
  };
  r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
 });
}
async function dbAll(store){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbPut(store,val){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,"readwrite").objectStore(store).put(val);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function dbDelete(store,key){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(store,"readwrite").objectStore(store).delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function saveLocal(){localStorage.setItem("ss_subs",JSON.stringify(state.subs));localStorage.setItem("ss_hist",JSON.stringify(state.history));localStorage.setItem("ss_likes",JSON.stringify(state.likes));localStorage.setItem("ss_user",JSON.stringify(state.user))}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function fmt(n){return n>=1000?(n/1000).toFixed(1)+"K":String(n)}
function initials(s="SS"){return s.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase()}

async function init(){
 try{state.user=JSON.parse(localStorage.getItem("ss_user")||"null")}catch{}
 state.videos=await dbAll("videos");
 if(!state.videos.length){
  const demo={id:1,title:"Welcome to Shri Shri",channel:"Shri Shri Official",desc:"Your free local video platform demo.",views:1,likes:0,created:Date.now(),comments:[],demo:true,url:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"};
  await dbPut("videos",demo); state.videos=[demo];
 }
 renderHome();
}
function videoSrc(v){return v.file?URL.createObjectURL(v.file):v.url}
function card(v){return `<div class="card" onclick="openVideo(${v.id})"><div class="thumb"><video muted preload="metadata" src="${videoSrc(v)}"></video></div><h3>${esc(v.title)}</h3><div class="meta">${esc(v.channel)}<br>${fmt(v.views||0)} views</div></div>`}
function go(p){if(p==="home")renderHome();if(p==="upload")renderUpload();if(p==="shorts")renderShorts();if(p==="subscriptions")renderSubs();if(p==="library")renderLibrary();if(p==="channel")renderChannel();if(p==="admin")renderAdmin();if(p==="login")renderLogin();scrollTo(0,0)}

function renderHome(list=state.videos){$("#app").innerHTML=`<div class="hero"><h1>Shri Shri</h1><div class="muted">Watch • Create • Share</div></div><h2>Recommended</h2>${list.length?`<div class="grid">${list.map(card).join("")}</div>`:`<div class="empty">No videos found.</div>`}`}
function searchVideos(){const q=$("#q").value.toLowerCase().trim();renderHome(state.videos.filter(v=>(v.title+" "+v.channel+" "+(v.desc||"")).toLowerCase().includes(q)))}

async function openVideo(id){
 const v=state.videos.find(x=>x.id===id);if(!v)return;v.views=(v.views||0)+1;await dbPut("videos",v);state.history=[id,...state.history.filter(x=>x!==id)].slice(0,30);saveLocal();
 const liked=state.likes.includes(id),sub=state.subs.includes(v.channel);
 $("#app").innerHTML=`<div class="player"><video controls autoplay src="${videoSrc(v)}"></video><h2>${esc(v.title)}</h2><div class="meta">${fmt(v.views)} views • ${esc(v.channel)}</div>
 <div class="actions"><button onclick="toggleLike(${id})">${liked?"👍 Liked":"👍 Like"}</button><button class="sub" onclick="toggleSub('${esc(v.channel)}',${id})">${sub?"Subscribed":"Subscribe"}</button></div>
 <p>${esc(v.desc||"")}</p><h3>Comments</h3><div class="row"><input id="commentText" placeholder="Add a comment"><button class="primary" onclick="addComment(${id})">Post</button></div>
 <div>${(v.comments||[]).map(c=>`<div class="comment"><b>${esc(c.name)}</b><br>${esc(c.text)}</div>`).join("")||'<div class="muted">No comments yet.</div>'}</div></div>`
}
async function toggleLike(id){state.likes=state.likes.includes(id)?state.likes.filter(x=>x!==id):[...state.likes,id];saveLocal();openVideo(id)}
function toggleSub(ch,id){state.subs=state.subs.includes(ch)?state.subs.filter(x=>x!==ch):[...state.subs,ch];saveLocal();openVideo(id)}
async function addComment(id){const t=$("#commentText").value.trim();if(!t)return;const v=state.videos.find(x=>x.id===id);v.comments=v.comments||[];v.comments.unshift({name:state.user?.name||"You",text:t});await dbPut("videos",v);openVideo(id)}

function renderUpload(){
 if(!state.user)return renderLogin("Login or create a free local account before uploading.");
 $("#app").innerHTML=`<h2>Upload Video</h2><div class="notice">Video aapke isi phone/browser me save hoga. Koi payment ya cloud account nahi chahiye.</div><div class="form">
 <label>Title</label><input id="ut">
 <label>Video file</label><input id="uf" type="file" accept="video/*">
 <label>Description</label><textarea id="ud"></textarea>
 <button class="primary" onclick="publish()">Publish</button></div>`
}
async function publish(){
 const title=$("#ut").value.trim(),file=$("#uf").files[0],desc=$("#ud").value.trim();
 if(!title||!file){alert("Title aur video file select karein.");return}
 const v={id:Date.now(),title,channel:state.user.name,desc,views:0,created:Date.now(),comments:[],file};
 await dbPut("videos",v);state.videos.unshift(v);renderChannel();
}
function renderShorts(){const v=state.videos[0];$("#app").innerHTML=`<h2>Shorts</h2><div class="short"><video controls loop src="${videoSrc(v)}"></video></div>`}
function renderSubs(){const list=state.videos.filter(v=>state.subs.includes(v.channel));$("#app").innerHTML=`<h2>Subscriptions</h2>${list.length?`<div class="grid">${list.map(card).join("")}</div>`:`<div class="empty">No subscribed videos yet.</div>`}`}
function renderLibrary(){const list=state.history.map(id=>state.videos.find(v=>v.id===id)).filter(Boolean);$("#app").innerHTML=`<h2>Watch History</h2>${list.length?`<div class="grid">${list.map(card).join("")}</div>`:`<div class="empty">History empty.</div>`}`}
function renderChannel(){if(!state.user)return renderLogin("Create your local account to open My Channel.");const mine=state.videos.filter(v=>v.channel===state.user.name);$("#app").innerHTML=`<h2>${esc(state.user.name)}</h2><div class="meta">${esc(state.user.email)}</div><div class="stats"><div class="stat"><b>${mine.length}</b><br><span class="muted">Videos</span></div><div class="stat"><b>${state.likes.length}</b><br><span class="muted">Liked</span></div><div class="stat"><b>${state.subs.length}</b><br><span class="muted">Subscriptions</span></div></div>${mine.length?`<div class="grid">${mine.map(card).join("")}</div>`:`<div class="empty">No uploads yet.</div>`}`}
function renderAdmin(){const total=state.videos.reduce((a,v)=>a+(v.views||0),0);$("#app").innerHTML=`<h2>Admin Panel</h2><div class="stats"><div class="stat"><b>${state.videos.length}</b><br><span class="muted">Videos</span></div><div class="stat"><b>${total}</b><br><span class="muted">Views</span></div><div class="stat"><b>${state.subs.length}</b><br><span class="muted">Subs</span></div></div><div style="overflow:auto"><table><tr><th>Video</th><th>Channel</th><th>Action</th></tr>${state.videos.map(v=>`<tr><td>${esc(v.title)}</td><td>${esc(v.channel)}</td><td><button onclick="removeVideo(${v.id})">Delete</button></td></tr>`).join("")}</table></div>`}
async function removeVideo(id){if(!confirm("Delete video?"))return;await dbDelete("videos",id);state.videos=state.videos.filter(v=>v.id!==id);renderAdmin()}

function renderLogin(msg=""){
 $("#app").innerHTML=`<h2>Login / Signup</h2>${msg?`<div class="notice">${esc(msg)}</div>`:""}<div class="form">
 <label>Name</label><input id="ln" placeholder="Your channel name">
 <label>Email</label><input id="le" type="email" placeholder="you@example.com">
 <label>Password</label><input id="lp" type="password">
 <div class="row" style="margin-top:14px"><button class="primary" onclick="signup()">Create Account</button><button onclick="login()">Login</button></div>
 ${state.user?`<p class="muted">Logged in as ${esc(state.user.name)}</p><button onclick="logout()">Logout</button>`:""}</div>`
}
async function signup(){const name=$("#ln").value.trim(),email=$("#le").value.trim().toLowerCase(),pass=$("#lp").value;if(!name||!email||!pass){alert("All fields required.");return}await dbPut("users",{name,email,pass});state.user={name,email};saveLocal();renderChannel()}
async function login(){const email=$("#le").value.trim().toLowerCase(),pass=$("#lp").value;const users=await dbAll("users");const u=users.find(x=>x.email===email&&x.pass===pass);if(!u){alert("Wrong email or password.");return}state.user={name:u.name,email:u.email};saveLocal();renderChannel()}
function logout(){state.user=null;saveLocal();renderLogin()}

document.getElementById("q").addEventListener("keydown",e=>{if(e.key==="Enter")searchVideos()});
init();
