// === app-nav.js ===

// Нижняя панель создаётся один раз, потом только обновляются классы
function _initBottomNav() {
  if (document.getElementById('bottomNav')) return;
  var n = document.createElement('div'); n.id = 'bottomNav'; n.className = 'bottom-nav';
  n.innerHTML =
    '<div class="nav-item" id="navHome" onclick="goHome()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/home.png?v=3" class="nav-icon">Главная</div>' +
    '<div class="nav-item" id="navMenu" onclick="showMenuPage()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/menu.png?v=3" class="nav-icon">Меню</div>' +
    '<div class="nav-item" id="navCabinet" onclick="showCabinetPage()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/profile.png?v=3" class="nav-icon">Кабинет</div>' +
    (isAdmin ? '<div class="nav-item" id="navAdmin" onclick="location.href=\'admin.html\'"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/admin.png?v=3" class="nav-icon">Админ</div>' : '');
  document.body.appendChild(n);
}

function renderBottomNav() {
  _initBottomNav();
  var menuViews = ['menu','popular','new_items','info','reviews','resources','product_card','info_product'];
  var cabinetViews = ['cabinet','favorites','my_orders'];
  var home = document.getElementById('navHome');
  var menu = document.getElementById('navMenu');
  var cab  = document.getElementById('navCabinet');
  if (home) home.className = 'nav-item' + (currentView==='categories' ? ' active' : '');
  if (menu) menu.className = 'nav-item' + (menuViews.indexOf(currentView)!==-1 ? ' active' : '');
  if (cab)  cab.className  = 'nav-item' + (cabinetViews.indexOf(currentView)!==-1 ? ' active' : '');
}

function goHome() {
  currentView='categories'; activeCategory='all';
  currentProducts=sortByDateDesc(products.slice()); currentPage=1;
  var s=document.getElementById('search'); if(s){s.style.display='block'; s.value='';}
  var sw=document.getElementById('searchWrap'); if(sw) sw.style.display='';
  if(typeof _updateClearBtn==='function') _updateClearBtn();
  showBanner(); renderMainPage(); window.scrollTo({top:0,behavior:'instant'});
}

function backToMenu() { showMenuPage(); }

function showMenuPage() {
  currentView='menu'; hideBanner();
  var s=document.getElementById('search'); if(s) s.style.display='none';
  var sw=document.getElementById('searchWrap'); if(sw) sw.style.display='none';
  var b=document.getElementById('categories'); if(!b) return; b.style.display='block';
  var h=
    '<h2 style="text-align:center;color:#f5c96a;margin:20px 0;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/menu.png?v=3" class="section-icon"> МЕНЮ</h2>' +
    '<div class="menu-grid">' +
      '<div class="menu-card" onclick="showPopular()"><div class="menu-icon"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/popular.png?v=1" class="menu-icon-img"></div><div class="menu-label">Популярное</div></div>' +
      '<div class="menu-card" onclick="showInfo()"><div class="menu-icon"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/announcements.png?v=1" class="menu-icon-img"></div><div class="menu-label">Объявления</div></div>' +
      '<div class="menu-card" onclick="showReviews()"><div class="menu-icon"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/reviews_icon.png?v=1" class="menu-icon-img"></div><div class="menu-label">Отзывы</div></div>' +
    '</div>' +
    '<div style="display:flex;justify-content:center;gap:12px;padding:0 12px;">' +
      '<div class="menu-card" onclick="showResources()" style="flex:1 1 0; max-width:calc((100% - 24px)/3);"><div class="menu-icon"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/resources.png?v=1" class="menu-icon-img"></div><div class="menu-label">Ресурсы</div></div>' +
      '<div class="menu-card" onclick="showNewItems()" style="flex:1 1 0; max-width:calc((100% - 24px)/3);"><div class="menu-icon"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/new_items.png?v=1" class="menu-icon-img"></div><div class="menu-label">Новинки</div></div>' +
    '</div>';
  _fadeSwap(b, h, function(){ renderBottomNav(); });
  window.scrollTo({top:0,behavior:'instant'});
}

function showCabinetPage() {
  currentView='cabinet'; hideBanner();
  var s=document.getElementById('search'); if(s) s.style.display='none';
  var sw=document.getElementById('searchWrap'); if(sw) sw.style.display='none';
  var b=document.getElementById('categories'); if(!b) return;
  var h=
    '<h2 style="text-align:center;color:#f5c96a;margin:20px 0;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/profile.png?v=3" class="section-icon"> КАБИНЕТ</h2>' +
    '<div style="display:flex;flex-direction:column;gap:10px;padding:0 10px;">' +
      '<div onclick="showMyOrders()" style="background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:15px;padding:18px;cursor:pointer;display:flex;align-items:center;gap:14px;"><div><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/orders.png?v=1" class="cabinet-icon"></div><div><div style="font-weight:bold;font-size:16px;color:#f5c96a;">Мои заказы</div><div style="font-size:13px;color:#aaa;">История и отслеживание</div></div></div>' +
      '<div onclick="showFavorites()" style="background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:15px;padding:18px;cursor:pointer;display:flex;align-items:center;gap:14px;"><div><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/favorites.png?v=1" class="cabinet-icon"></div><div><div style="font-weight:bold;font-size:16px;color:#f5c96a;">Избранное</div><div style="font-size:13px;color:#aaa;">' + favorites.length + ' товаров</div></div></div>' +
      '<div onclick="window.open(\'https://t.me/Bezopasnaia_Sdelka\',\'_blank\')" style="background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:15px;padding:18px;cursor:pointer;display:flex;align-items:center;gap:14px;"><div><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/support.png?v=1" class="cabinet-icon"></div><div><div style="font-weight:bold;font-size:16px;color:#f5c96a;">Поддержка</div><div style="font-size:13px;color:#aaa;">Связаться с нами</div></div></div>' +
    '</div>';
  _fadeSwap(b, h, function(){ renderBottomNav(); });
  window.scrollTo({top:0,behavior:'instant'});
}

// Ресурсы (п.11) — рабочие ссылки на группы
function showResources() {
  currentView='resources'; hideBanner();
  var s=document.getElementById('search'); if(s) s.style.display='none';
  var sw=document.getElementById('searchWrap'); if(sw) sw.style.display='none';
  var b=document.getElementById('categories'); if(!b) return;

  var res=[
    {title:'Наша основная группа', desc:'Главное сообщество',  btn:'Подписаться', url:'https://t.me/voenntorgsvoi'},
  ];

  var h='<div class="page-back-btn" onclick="backToMenu()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
    '<h2 style="text-align:center;color:#f5c96a;margin:10px 0 16px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/resources.png?v=1" class="section-icon">Ресурсы</h2>' +
    '<div style="display:flex;flex-direction:column;gap:12px;padding:0 10px 20px;">';

  res.forEach(function(r){
    h+='<div style="background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:15px;padding:18px;">' +
      '<div style="margin-bottom:12px;">' +
        '<div style="font-weight:bold;font-size:16px;color:#f5c96a;">' + r.title + '</div>' +
        '<div style="font-size:13px;color:#aaa;">' + r.desc + '</div>' +
      '</div>' +
      '<a href="' + r.url + '" target="_blank" style="display:block;width:100%;padding:12px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:10px;font-weight:bold;font-size:14px;text-align:center;text-decoration:none;box-sizing:border-box;">' + r.btn + '</a>' +
    '</div>';
  });
  h+='</div>';
  _fadeSwap(b, h, function(){ renderBottomNav(); });
  window.scrollTo({top:0,behavior:'instant'});
}

function showInfoPage() { alert('<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/info.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Информация — в разработке'); }
