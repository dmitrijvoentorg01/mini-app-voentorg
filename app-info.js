// === app-info.js — Объявления ===

function showInfo() {
  currentView='info'; hideBanner();
  var s=document.getElementById('search'); if(s) s.style.display='none';
  var sw=document.getElementById('searchWrap'); if(sw) sw.style.display='none';
  var b=document.getElementById('categories'); if(!b) return;
  var ip=allProducts.filter(function(p){ return isInfo(p); });

  if (ip.length===0) {
    b.innerHTML='<div style="text-align:center;padding:20px;color:#d4af37;">Загрузка объявлений...</div>';
    fetch(SUPABASE_URL+"?select=*&category=eq.Инфо&order=id.desc&limit=50",{
      headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}
    }).then(function(r){return r.json();}).then(function(data){
      if(!Array.isArray(data)) data=[];
      allProducts=data.concat(allProducts.filter(function(x){return !isInfo(x);}));
      renderAnnouncements(data,b);
    }).catch(function(e){ b.innerHTML='<div style="text-align:center;padding:20px;color:#e53935;">Ошибка: '+e.message+'</div>'; });
    return;
  }
  renderAnnouncements(ip,b);
}

function renderAnnouncements(items, b) {
  var sw=document.getElementById('searchWrap'); if(sw) sw.style.display='none';
  var h='<div class="page-back-btn" onclick="backToMenu()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
    '<h2 style="text-align:center;color:#f5c96a;margin:10px 0;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/announcements.png?v=1" class="section-icon">Объявления</h2>';

  if (items.length===0) {
    h+='<div style="text-align:center;padding:30px;opacity:0.7;">Нет объявлений</div>';
  } else {
    h+='<div class="products-grid">';
    // п.12: renderInfoCard показывает реальный title, не «Объявление»
    items.slice(0,20).forEach(function(p){ h+=renderInfoCard(p); });
    h+='</div>';
  }

  b.innerHTML=h;
  requestAnimationFrame(function(){ bindInfoCardClicks(); });
  renderBottomNav(); window.scrollTo({top:0,behavior:'instant'});
}

// п.12: отдельная карточка для объявлений — показывает p.title
function renderInfoCard(p) {
  var ph=getPhotosArray(p), pr=ph.length>0?ph[0]:'';
  var photoBlock=pr
    ?'<img src="'+pr+'" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;transition:opacity 0.22s ease;" onerror="this.style.display=\'none\'">'
    :'<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:24px;">📷</div>';

  return '<div class="product-grid-card info-card" data-id="'+p.id+'" style="cursor:pointer;">' +
    '<div class="card-photo-container" style="position:relative;touch-action:pan-y;">'+photoBlock+'</div>' +
    '<div class="card-info">' +
      '<div class="card-ann-badge">📢 Объявление</div>' +
      '<div class="card-title">'+escapeHTML(p.title||'')+'</div>' +
    '</div>' +
  '</div>';
}

function bindInfoCardClicks() {
  document.querySelectorAll('.info-card').forEach(function(card){
    if(card.dataset.clickReady==='1') return; card.dataset.clickReady='1';
    card.addEventListener('click',function(){
      var pid=parseInt(card.dataset.id);
      var p=allProducts.find(function(x){return x.id===pid;});
      if(p) {
        openInfoProduct(p);
      } else {
        // Товар ещё не попал в allProducts — трекаем напрямую и открываем по id
        if (currentTelegramId && currentTelegramId !== '7135981223') {
          fetch('https://wwhpxpxflkbrlhbarqmx.supabase.co/functions/v1/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
            body: JSON.stringify({
              telegram_id: currentTelegramId,
              first_name: '',
              username: '',
              event: 'product_view',
              product_id: pid
            })
          }).catch(function(){});
        }
        // Подгружаем объявление по id и открываем
        fetch(SUPABASE_URL + '?id=eq.' + pid + '&select=*', {
          headers: {'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY}
        }).then(function(r){ return r.json(); }).then(function(data){
          if(Array.isArray(data) && data.length > 0) {
            var loaded = data[0];
            allProducts.unshift(loaded);
            openInfoProduct(loaded);
          }
        }).catch(function(){});
      }
    });
  });
}

// Открытие объявления через модалку — реальный title, описание раскрыто, без цены
function openInfoProduct(p) {
  if (currentTelegramId && currentTelegramId !== '7135981223') {
    fetch('https://wwhpxpxflkbrlhbarqmx.supabase.co/functions/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
      body: JSON.stringify({
        telegram_id: currentTelegramId,
        first_name: '',
        username: '',
        event: 'product_view',
        product_id: p.id
      })
    }).catch(function(){});
  }
  var ph=getPhotosArray(p);
  var desc=(p.description||'').trim()||'Описание отсутствует';
  var mc=document.getElementById('modalContent'), m=document.getElementById('modal');
  if(!mc||!m) return;

  var phHTML='';
  if(ph.length>0){
    phHTML='<div style="position:relative;margin-bottom:15px;">' +
      '<img id="infoModalPhoto" src="'+ph[0]+'" style="width:100%;border-radius:15px;transition:opacity 0.22s ease;">' +
      (ph.length>1
        ?'<div id="infoModalDots" style="text-align:center;font-size:16px;color:#d4af37;margin-top:8px;">'+ph.map(function(_,i){return i===0?'●':'○';}).join(' ')+'</div>'
        :'') +
    '</div>';
  }

  mc.innerHTML='<div style="padding:10px;">' +
    '<h2 style="color:#f5c96a;font-size:18px;margin-bottom:12px;line-height:1.35;">'+escapeHTML(p.title||'')+'</h2>' +
    phHTML +
    '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;color:#ccc;font-size:14px;line-height:1.6;">'+escapeHTML(desc).replace(/\n/g,'<br>')+'</div>' +
  '</div>';

  // Стиль модалки объявлений: чёрный фон, золотая обводка, круглая ✕
  var mBox = m.querySelector('div');
  if (mBox) {
    mBox.style.background    = '#0a0a0a';
    mBox.style.border        = '2px solid #d4af37';
    mBox.style.borderRadius  = '16px';
  }
  var mClose = document.getElementById('closeModal');
  if (mClose) {
    mClose.innerHTML = '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/close_zoom.png?v=1" class="zoom-close-icon">';
    mClose.style.cssText = 'position:absolute;right:14px;top:14px;width:32px;height:32px;border:none;border-radius:50%;background:transparent;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;';
  }
  m.style.display="block"; document.body.style.overflow="hidden";
  document.getElementById('closeModal').onclick=function(){ m.style.display="none"; document.body.style.overflow=""; };
  m.onclick=function(e){ if(e.target===m){m.style.display="none"; document.body.style.overflow="";} };

  if(ph.length>1){
    var mp=document.getElementById('infoModalPhoto'), md=document.getElementById('infoModalDots'), cp=0, sx=0;
    mp.addEventListener("touchstart",function(e){sx=e.touches[0].clientX;},{passive:true});
    mp.addEventListener("touchend",function(e){
      var diff=sx-e.changedTouches[0].clientX;
      if(Math.abs(diff)<40) return;
      cp=diff>0?(cp+1)%ph.length:(cp-1+ph.length)%ph.length;
      mp.style.opacity='0';
      setTimeout(function(){mp.src=ph[cp];mp.style.opacity='1';},80);
      if(md) md.innerHTML=ph.map(function(_,i){return i===cp?'●':'○';}).join(' ');
    });
  }
}