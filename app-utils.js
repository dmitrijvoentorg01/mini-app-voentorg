// === app-utils.js — Вспомогательные функции ===

function escapeHTML(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }

function getPhotosArray(p) {
  var r = p?.photos; if (!r) return [];
  if (Array.isArray(r)) return r.filter(function(x){return x&&typeof x==="string"&&x.indexOf("http")!==-1;});
  if (typeof r === "string") {
    r = r.trim();
    try { var j = JSON.parse(r); if (Array.isArray(j)) return j.filter(function(x){return x&&typeof x==="string"&&x.indexOf("http")===0;}); } catch(e) {}
    return r.split(/[,\n]/).map(function(x){return x.trim();}).filter(function(x){return x&&x.indexOf("http")===0;});
  }
  return [];
}

function getStatusBadge(p) {
  if (!p?.status) return {text:"",color:""};
  if (p.status === "available") return {text:"🟢 В наличии",color:"#4caf50"};
  if (p.status === "sold") return {text:"🔴 Продано",color:"#e53935"};
  return {text:"",color:""};
}

function isNew(p) {
  if (!p || p.category === "Инфо") return false;
  var d = p.date || ""; if (typeof d === "string") d = d.substring(0,10);
  if (!d || d.length < 10) return false;
  return new Date(d) >= new Date(Date.now() - 3*86400000);
}

function sortByDateDesc(l) {
  return l ? l.slice().sort(function(a,b){ return (b.id||0)-(a.id||0); }) : [];
}
function sortByViews(l) { return l ? l.slice().sort(function(a,b){return (b.views||0)-(a.views||0);}) : []; }

function formatDate(d) {
  if (!d) return "";
  var dt = new Date(d); if (isNaN(dt.getTime())) return "";
  return String(dt.getDate()).padStart(2,"0") + "-" + String(dt.getMonth()+1).padStart(2,"0") + "-" + dt.getFullYear();
}

function isInfo(p) { return p && (p.category === "Инфо" || (p.category && p.category.toLowerCase() === "инфо")); }