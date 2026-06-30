// === app-render.js ===

// Состояние при переходе в карточку товара
var _prevView = 'categories';
var _prevScrollY = 0;
var _prevCategory = 'all';    // activeCategory в момент открытия карточки
var _prevPage = 1;            // currentPage в момент открытия карточки
var _prevLoadedCount = 0;     // сколько товаров реально показано (перед открытием карточки)
var _prevSearchQuery = '';    // строка поиска в момент открытия карточки
var _cardPhotoIdx = 0;
var _savedPageHTML = '';

// ─────────────────────────────────────────────────────────────────
//  Предзагрузка фото
// ─────────────────────────────────────────────────────────────────
function _preloadImage(url) {
  if (!url) return;
  try { var img = new Image(); img.src = url; img.decode && img.decode().catch(function(){}); } catch(e) {}
}

// ─────────────────────────────────────────────────────────────────
//  МИНИ-КАРТОЧКА В СЕТКЕ
// ─────────────────────────────────────────────────────────────────
function renderProductGridCard(p, eager = false) {
  try {
    var ph = getPhotosArray(p), pr = ph.length > 0 ? ph[0] : "";
    var nb = isNew(p) && !isInfo(p) ? '<div class="card-new-badge">NEW</div>' : '';
    var sb = getStatusBadge(p);
    var sl = sb.text ? '<div class="card-status" style="border:1px solid ' + sb.color + ';color:' + sb.color + ';">' + sb.text + '</div>' : '';
    var fid = isFav(p.id);
    var fs = '<div class="fav-star" data-id="' + p.id + '">' + (fid ? '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_filled.png?v=1" style="width:18px;height:18px;vertical-align:middle;">' : '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_empty.png?v=1" style="width:18px;height:18px;vertical-align:middle;">') + '</div>';
    var loadingAttr = eager ? 'eager' : 'lazy';

    // Для объявлений (isInfo): бейдж «📢 Объявление» вместо цены
    // Для товаров: показываем цену
    var priceRow = isInfo(p)
      ? '<div class="card-ann-badge"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/announcements.png?v=1" style="width:14px;height:14px;vertical-align:middle;margin-right:3px;"> Объявление</div>'
      : (p.price ? '<div class="card-price">' + escapeHTML(p.price) + '</div>' : '');

    var html = '<div class="product-grid-card" data-id="' + p.id + '" style="cursor:pointer;">' +
      '<div class="card-photo-container" style="position:relative;touch-action:pan-y;border:1px solid rgba(212,175,55,0.3);border-radius:10px;overflow:hidden;">' +
        (ph.length > 0
          ? '<img src="' + pr + '" class="card-photo" data-photos="' + encodeURIComponent(JSON.stringify(ph)) + '" loading="' + loadingAttr + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';" style="width:100%;height:100%;object-fit:cover;display:block;transition:opacity 0.22s ease;"><div style="display:none;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;position:absolute;top:0;left:0;width:100%;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_photo.png?v=1" style="width:20px;height:20px;vertical-align:middle;"></div>'
          : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:12px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_photo.png?v=1" style="width:20px;height:20px;vertical-align:middle;"></div>') +
        nb + fs +
        (ph.length > 1 ? '<div class="card-dots" style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:3;">' + ph.map(function(_,i){return '<span style="width:5px;height:5px;border-radius:50%;background:' + (i===0?'#f5c96a':'rgba(255,255,255,0.5)') + ';transition:background 0.2s;"></span>';}).join('') + '</div>' : '') +
      '</div>' +
      '<div class="card-info">' + priceRow + '<div class="card-title">' + escapeHTML(p.title || "") + '</div>' + sl + '</div>' +
    '</div>';
    // Предзагружаем соседние фото этого товара для быстрого свайпа
    if (ph.length > 1) { _preloadImage(ph[1]); }
    return html;
  } catch(e) {
    return '<div class="product-grid-card"><div class="card-photo-container"><div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;">Ошибка</div></div><div class="card-info"><div class="card-title">' + escapeHTML((p && p.title) || "") + '</div></div></div>';
  }
}

// ─────────────────────────────────────────────────────────────────
//  КАРТОЧКА ТОВАРА — ОТДЕЛЬНАЯ СТРАНИЦА (п.1, 2, 5, 6)
// ─────────────────────────────────────────────────────────────────
function deleteProductFromCard(productId) {
  var SUPABASE_URL_PRODUCTS = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/rest/v1/products';
  var SUPABASE_KEY = 'sb_publishable_Fzk6Y9w1V3DOZ0Opn4m4lw_pynygFV8';
  // Удаляем из избранного
  var idx = favorites.indexOf(productId);
  if (idx !== -1) {
    favorites.splice(idx, 1);
    saveFavs();
  }
  fetch(SUPABASE_URL_PRODUCTS + '?id=eq.' + productId, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function() {
    alert('Товар удалён');
    location.reload();
  }).catch(function(e) {
    alert('Ошибка: ' + e.message);
  });
}

function openProductCard(pid) {
  var p = allProducts.find(function(x){return x.id===pid;}) || products.find(function(x){return x.id===pid;});
  if (!p) return;
  if (currentTelegramId && currentTelegramId !== '8576141705') {
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

  // Объявления — своя страница через openInfoProduct
  if (isInfo(p)) { openInfoProduct(p); return; }

  // Запоминаем откуда пришли
  _prevView = currentView;
  _prevScrollY = window.scrollY;
  _prevCategory = activeCategory; // сохраняем активную категорию
  _prevPage = currentPage;        // сохраняем текущую страницу пагинации
  // сохраняем реальное количество показанных товаров:
  // currentPage страниц по perPage, но не больше чем есть в currentProducts
  _prevLoadedCount = Math.min(currentPage * perPage, currentProducts.length);
  // сохраняем поисковый запрос (пустая строка = поиска не было)
  var _sq = document.getElementById('search');
  _prevSearchQuery = _sq ? _sq.value.trim() : '';
  _cardPhotoIdx = 0;

  currentView = 'product_card';
  hideBanner();
  var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';
  var b = document.getElementById('categories'); if (!b) return;

  // Сохраняем текущий HTML страницы
  _savedPageHTML = b.innerHTML;

  var ph = getPhotosArray(p);
  var desc = (p.description || '').trim() || 'Описание отсутствует';
  // Предзагрузка соседних фото для быстрого свайпа
  if (ph.length > 1) {
    var _preloadNeighbors = function(idx) {
      var n = (idx + 1) % ph.length;
      var p = (idx - 1 + ph.length) % ph.length;
      (new Image()).src = ph[n];
      (new Image()).src = ph[p];
    };
    _preloadNeighbors(0);
  }
  var fid = isFav(p.id);
  var sb = getStatusBadge(p);
  var statusHTML = sb.text ? '<div style="display:inline-block;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid ' + sb.color + ';color:' + sb.color + ';margin-bottom:10px;">' + sb.text + '</div>' : '';

  // Галерея: только свайп (без стрелок), клик → зум
  var photoHTML = '';
  if (ph.length > 0) {
    photoHTML =
      '<div id="pcardGallery" style="position:relative;width:100%;overflow:hidden;border-radius:10px;">' +
        '<img id="pcardMainPhoto" src="' + ph[0] + '" style="width:100%;max-height:70vw;object-fit:contain;display:block;cursor:pointer;border:2px solid #d4af37;border-radius:10px;">' +
        (ph.length > 1
          ? '<div id="pcardDots" style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:3;">' +
              ph.map(function(_,i){ return '<span data-i="' + i + '" style="width:' + (i===0?'8':'7') + 'px;height:' + (i===0?'8':'7') + 'px;border-radius:50%;background:' + (i===0?'#f5c96a':'rgba(255,255,255,0.35)') + ';transition:all 0.2s;cursor:pointer;"></span>'; }).join('') +
            '</div>'
          : '') +
      '</div>';
  }

  // Показываем карточку в overlay поверх страницы
  var overlay = document.getElementById('productCardOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'productCardOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.62)),url(\'background.jpg.PNG\');background-size:cover;background-position:center;z-index:10000;overflow-y:auto;opacity:0;transition:opacity 0.15s ease;';
    document.body.appendChild(overlay);
  }
  overlay.style.opacity = '0';
  overlay.style.display = 'block';
  overlay.innerHTML =
    '<div id="pcardBack" class="page-back-btn"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
    '<div style="margin:8px 10px 20px;background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:16px;padding:14px;">' +
      photoHTML +
      '<div style="margin-top:14px;">' +
        '<h2 style="font-size:18px;font-weight:bold;color:#fff;margin-bottom:8px;line-height:1.35;">' + escapeHTML(p.title || '') + '</h2>' +
        statusHTML +
        // Цена + плашка наличия в одну строку
        (function(){
          var st = (p.stock !== undefined && p.stock !== null) ? parseInt(p.stock, 10) : 1;
          if (isNaN(st)) st = 1;
          var badge = st === 0
            ? '<span style="font-size:12px;font-weight:700;color:#e53935;border:1px solid #e53935;border-radius:6px;padding:2px 8px;">Продано</span>'
            : '<span style="font-size:12px;font-weight:700;color:#4caf50;border:1px solid #4caf50;border-radius:6px;padding:2px 8px;">В наличии</span>';
          var priceRow = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">' +
            '<span style="font-size:24px;font-weight:800;color:#f5c96a;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/price.png?v=1" style="width:26px;height:26px;vertical-align:middle;margin-right:2px;"> ' + escapeHTML(p.price || '') + '</span>' +
            '<span style="color:#888;font-size:14px;">|</span>' +
            badge +
            '</div>';
          // Кнопка Заказать
          var orderBlock = '';
          if (st === 0) {
            orderBlock = '<button disabled style="width:100%;padding:15px;background:#333;color:#666;border:none;border-radius:12px;font-weight:bold;font-size:16px;cursor:not-allowed;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/cart.png?v=1" style="width:20px;height:20px;vertical-align:middle;"> Заказать</button>';
          } else {
            orderBlock = '<button onclick="openOrderForm(' + p.id + ',1)" style="width:100%;padding:15px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:16px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/cart.png?v=1" style="width:20px;height:20px;vertical-align:middle;"> Заказать</button>';
          }
          if (isAdmin) {
            orderBlock += '<button onclick="if(confirm(\'Удалить этот товар?\')){deleteProductFromCard(' + p.id + ')}" style="width:100%;padding:12px;margin-top:8px;background:#000;color:#e53935;border:2px solid #e53935;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_delete.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Удалить товар</button>';
          }
          var _contactText = 'Здравствуйте!%20Обращаюсь%20к%20вам%20по%20товару%3A%0AНазвание%3A%20' + encodeURIComponent(p.title || '') + '%0AЦена%3A%20' + encodeURIComponent(p.price || '') + '%0AID%3A%20' + p.id;
          orderBlock += '<button onclick="window.open(\'https://t.me/GARANT_VOENTORG?text=' + _contactText + '\',\'_blank\')" style="width:100%;padding:12px;margin-top:8px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/support.png?v=1" style="width:18px;height:18px;vertical-align:middle;margin-right:3px;"> Связаться с администратором</button>';
          return priceRow +
            '<button id="pcardFavBtn" onclick="toggleFavInCard(' + p.id + ')" style="width:100%;padding:12px;margin-bottom:8px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;">' + (fid ? '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_filled.png?v=1" style="width:18px;height:18px;vertical-align:middle;"> В избранном' : '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_empty.png?v=1" style="width:18px;height:18px;vertical-align:middle;"> В избранное') + '</button>' +
            '<button id="pcardDescBtn" onclick="toggleProductDesc()" style="width:100%;padding:12px;margin-bottom:8px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;text-align:center;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/description.png?v=1" style="width:18px;height:18px;vertical-align:middle;"> Описание</button>' +
            '<div id="pcardDesc" style="display:none;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;margin-bottom:10px;color:#ccc;font-size:14px;line-height:1.6;">' + escapeHTML(desc).replace(/\n/g,'<br>') + '</div>' +
            orderBlock;
        })() +
      '</div>' +
    '</div>';

  renderBottomNav();
  overlay.scrollTop = 0;
  // Плавное появление overlay после вставки контента
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      overlay.style.opacity = '1';
    });
  });

  // Скрываем кнопку возврата из категории пока открыта карточка товара
  var _catBackBtn = document.getElementById('catBackBtn');
  if (_catBackBtn) _catBackBtn.style.display = 'none';

  // Кнопка «Назад»: просто скрываем overlay, страница уже под ним
  document.getElementById('pcardBack').onclick = function() {
    var m = document.getElementById('modal');
    if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
    overlay.style.display = 'none';
    overlay.innerHTML = '';
    currentView = _prevView;
    var swR = document.getElementById('searchWrap');
    if (_prevView === 'new_items' || _prevView === 'popular' || _prevView === 'favorites') {
      if (swR) swR.style.display = 'none';
    } else {
      if (swR) swR.style.display = '';
    }
    if (_prevView === 'categories') { showBanner(); }
    renderBottomNav();
    if (_prevCategory !== 'all') { var cb = document.getElementById('catBackBtn'); if (cb) cb.style.display = ''; }
    window.scrollTo({top:_prevScrollY,behavior:'instant'});
  };

  // Галерея: свайп + точки + зум
  if (ph.length > 0) {
    var mphoto = document.getElementById('pcardMainPhoto');
    var gallery = document.getElementById('pcardGallery');
    var dotEls = document.querySelectorAll('#pcardDots span');

    // Клик на фото → зум (п.5)
    mphoto.onclick = function() { openPhotoZoom(pid, _cardPhotoIdx); };

    if (ph.length > 1) {
      function cardGoTo(idx) {
        idx = (idx + ph.length) % ph.length;
        _cardPhotoIdx = idx;
        // Мгновенная смена — предзагрузка уже закешировала фото
        mphoto.src = ph[idx];
        dotEls.forEach(function(d,i){
          d.style.width  = (i===idx?'8':'7')+'px';
          d.style.height = (i===idx?'8':'7')+'px';
          d.style.background = i===idx ? '#f5c96a' : 'rgba(255,255,255,0.35)';
        });
        // Предзагрузка новых соседних
        var nxt = (idx + 1) % ph.length;
        var prv = (idx - 1 + ph.length) % ph.length;
        (new Image()).src = ph[nxt];
        (new Image()).src = ph[prv];
      }
      dotEls.forEach(function(d){ d.onclick = function(e){ e.stopPropagation(); cardGoTo(parseInt(d.dataset.i)); }; });

      // Свайп в карточке (п.6)
      var gsx=0, gsy=0, gmov=false;
      gallery.addEventListener('touchstart',function(e){gsx=e.touches[0].clientX;gsy=e.touches[0].clientY;gmov=false;},{passive:true});
      gallery.addEventListener('touchmove',function(){gmov=true;},{passive:true});
      gallery.addEventListener('touchend',function(e){
        if(!gmov) return;
        var dx=gsx-e.changedTouches[0].clientX, dy=gsy-e.changedTouches[0].clientY;
        if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>35) cardGoTo(_cardPhotoIdx+(dx>0?1:-1));
      });
    }
  }
}

// Кнопка Описание (п.2)
// ── Счётчик количества на карточке товара ──
function _pcardQty(delta, maxStock) {
  var el = document.getElementById('pcardQtyVal');
  if (!el) return;
  var cur = parseInt(el.textContent, 10) || 1;
  cur = Math.min(Math.max(1, cur + delta), maxStock);
  el.textContent = cur;
}
function _pcardGetQty() {
  var el = document.getElementById('pcardQtyVal');
  return el ? (parseInt(el.textContent, 10) || 1) : 1;
}

function toggleProductDesc() {
  var d = document.getElementById('pcardDesc');
  var btn = document.getElementById('pcardDescBtn');
  if (!d) return;
  var open = d.style.display !== 'none';
  d.style.display = open ? 'none' : 'block';
  if (btn) btn.innerHTML = open ? '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/description.png?v=1" style="width:18px;height:18px;vertical-align:middle;"> Описание' : '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/description.png?v=1" style="width:18px;height:18px;vertical-align:middle;"> Скрыть описание';
}

// Избранное в карточке (п.2)
function toggleFavInCard(pid) {
  toggleFav(pid);
  var btn = document.getElementById('pcardFavBtn');
  if (btn) btn.innerHTML = isFav(pid) ? '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_filled.png?v=1" style="width:18px;height:18px;vertical-align:middle;"> В избранном' : '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_empty.png?v=1" style="width:18px;height:18px;vertical-align:middle;"> В избранное';
  updateFavStar(pid);
}

// ─────────────────────────────────────────────────────────────────
//  ЗУМ ФОТО (п.5) — pan + zoom как на Wildberries
// ─────────────────────────────────────────────────────────────────
function openPhotoZoom(pid, startIdx) {
  var p = allProducts.find(function(x){return x.id===pid;}) || products.find(function(x){return x.id===pid;});
  if (!p) return;
  var ph = getPhotosArray(p);
  if (!ph.length) return;
  var ci = startIdx || 0;
  // Предзагрузка соседних фото для быстрого свайпа в зуме
  if (ph.length > 1) {
    var n = (ci + 1) % ph.length;
    var p = (ci - 1 + ph.length) % ph.length;
    (new Image()).src = ph[n];
    (new Image()).src = ph[p];
  }

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;';

  overlay.innerHTML =
    '<button id="zoomClose" style="position:absolute;top:16px;right:16px;width:40px;height:40px;border:none;background:rgba(255,255,255,0.15);color:#fff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/close_zoom.png?v=1" class="zoom-close-icon"></button>' +
    '<div id="zoomStage" style="width:100%;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;max-height:80vh;position:relative;">' +
      '<img id="zoomImg" src="' + ph[ci] + '" style="max-width:100%;max-height:80vh;object-fit:contain;touch-action:none;user-select:none;-webkit-user-select:none;will-change:transform;">' +
    '</div>' +
    (ph.length > 1
      ? '<div id="zoomDots" style="display:flex;gap:8px;margin-top:14px;z-index:2;">' +
          ph.map(function(_,i){ return '<span style="width:8px;height:8px;border-radius:50%;background:' + (i===ci?'#f5c96a':'rgba(255,255,255,0.3)') + ';transition:background 0.2s;"></span>'; }).join('') +
        '</div>'
      : '');

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  var zImg = document.getElementById('zoomImg');
  var zStage = document.getElementById('zoomStage');
  var zDotEls = overlay.querySelectorAll('#zoomDots span');

  // ── Трансформация: translate(tx,ty) scale(sc) ───────────────────
  var sc = 1, tx = 0, ty = 0, rafId = 0;

  function clampPan() {
    var iw = zImg.naturalWidth  || zImg.offsetWidth  || 1;
    var ih = zImg.naturalHeight || zImg.offsetHeight || 1;
    var stW = zStage.offsetWidth  || window.innerWidth;
    var stH = zStage.offsetHeight || window.innerHeight * 0.8;
    var ratio = Math.min(stW / iw, stH / ih, 1);
    var maxTx = Math.max(0, (iw * ratio * sc - stW) / 2);
    var maxTy = Math.max(0, (ih * ratio * sc - stH) / 2);
    tx = Math.min(maxTx, Math.max(-maxTx, tx));
    ty = Math.min(maxTy, Math.max(-maxTy, ty));
  }

  function applyTransform(animated) {
    zImg.style.transition = animated ? 'transform 0.35s ease-out' : 'none';
    zImg.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
  }

  // snapBack: вызывается когда ВСЕ пальцы убраны.
  // sc > 1 → зажать pan в границах + анимировать.
  // sc <= 1 → вернуть в центр.
  function snapBack() {
    if (sc <= 1.05) { sc = 1; tx = 0; ty = 0; }
    else { clampPan(); }
    applyTransform(true);
  }

  // ── Смена фото — мгновенная ──────────────────────────────────────
  function zGoTo(idx) {
    idx = (idx + ph.length) % ph.length; ci = idx;
    _cardPhotoIdx = ci;
    // Мгновенная смена
    zImg.src = ph[ci];
    sc = 1; tx = 0; ty = 0;
    applyTransform(false);
    // Синхронизируем фото в карточке
    var mp = document.getElementById('pcardMainPhoto');
    if (mp) mp.src = ph[ci];
    document.querySelectorAll('#pcardDots span').forEach(function(d,i){
      d.style.width=(i===ci?'8':'7')+'px'; d.style.height=(i===ci?'8':'7')+'px';
      d.style.background=i===ci?'#f5c96a':'rgba(255,255,255,0.35)';
    });
    zDotEls.forEach(function(d,i){ d.style.background=i===ci?'#f5c96a':'rgba(255,255,255,0.3)'; });
    // Предзагружаем новые соседние
    var nxt = (ci + 1) % ph.length;
    var prv = (ci - 1 + ph.length) % ph.length;
    (new Image()).src = ph[nxt];
    (new Image()).src = ph[prv];
  }

  function closeZoom() { overlay.remove(); document.body.style.overflow = ''; }
  document.getElementById('zoomClose').onclick = closeZoom;
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeZoom(); });

  // ── Жесты ───────────────────────────────────────────────────────
  // Используем счётчик activeTouches вместо флага pinching —
  // это устраняет проблему с порядком touchend событий.
  var activeTouches = 0;
  var hadPinch      = false;   // был ли пинч в текущей серии касаний
  var initDist = 0, initSc = 1, initMidX = 0, initMidY = 0, initTx = 0, initTy = 0;
  var p1x = 0, p1y = 0, swipeStartX = 0, swipeStartY = 0;
  var gestureStartSc = 1;      // sc в момент начала касания (для определения свайпа)

  zStage.addEventListener('touchstart', function(e) {
    activeTouches = e.touches.length;
    if (e.touches.length === 1) {
      p1x = e.touches[0].clientX;
      p1y = e.touches[0].clientY;
      swipeStartX = p1x;
      swipeStartY = p1y;
      gestureStartSc = sc;
      hadPinch = false;
    }
    if (e.touches.length === 2) {
      hadPinch = true;
      var t0 = e.touches[0], t1 = e.touches[1];
      initDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      initMidX = (t0.clientX + t1.clientX) / 2;
      initMidY = (t0.clientY + t1.clientY) / 2;
      initSc = sc; initTx = tx; initTy = ty;
    }
  }, { passive: true });

  zStage.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      var t0 = e.touches[0], t1 = e.touches[1];
      var dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      var newSc = Math.min(Math.max(initSc * (dist / initDist), 1), 6);
      var curMidX = (t0.clientX + t1.clientX) / 2;
      var curMidY = (t0.clientY + t1.clientY) / 2;
      var scRatio = newSc / initSc;
      var stageRect = zStage.getBoundingClientRect();
      var relX = initMidX - (stageRect.left + stageRect.width  / 2);
      var relY = initMidY - (stageRect.top  + stageRect.height / 2);
      var newTx = (curMidX - initMidX) + initTx + relX * (1 - scRatio);
      var newTy = (curMidY - initMidY) + initTy + relY * (1 - scRatio);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function() {
        sc = newSc; tx = newTx; ty = newTy;
        clampPan(); applyTransform(false);
      });
    } else if (e.touches.length === 1 && sc > 1.05) {
      // Pan одним пальцем при зуме
      e.preventDefault();
      var dx = e.touches[0].clientX - p1x;
      var dy = e.touches[0].clientY - p1y;
      p1x = e.touches[0].clientX;
      p1y = e.touches[0].clientY;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function() {
        tx += dx; ty += dy;
        clampPan(); applyTransform(false);
      });
    }
  }, { passive: false });

  zStage.addEventListener('touchend', function(e) {
    // Ждём пока ВСЕ пальцы не убраны
    if (e.touches.length > 0) return;
    // Все пальцы убраны — ВСЕГДА возвращаем в исходное
    sc = 1; tx = 0; ty = 0;
    applyTransform(true);
    // Свайп для переключения фото (только если не было pinch)
    if (ph.length > 1 && !hadPinch) {
      var dx = swipeStartX - e.changedTouches[0].clientX;
      var dy = swipeStartY - e.changedTouches[0].clientY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
        zGoTo(ci + (dx > 0 ? 1 : -1));
      }
    }
    hadPinch = false;
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────────────
//  ГЛАВНАЯ СТРАНИЦА И РЕНДЕР СЕТКИ
//
//  renderMainPage() — для перехода на главную, сбрасывает фильтры
//  _renderGrid()    — рисует DOM из currentProducts БЕЗ сброса фильтров
//
//  ВАЖНО: setCategory и renderCatalog вызывают _renderGrid(), а НЕ
//  renderMainPage() — иначе currentProducts сбрасывается на все товары
//  и фильтрация/поиск перестают работать (пп.3, 4).
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
//  Плавная смена контента: fade out → innerHTML → fade in (120мс)
// ─────────────────────────────────────────────────────────────────
function _fadeSwap(el, html, cb) {
  el.classList.add('page-fade');
  setTimeout(function() {
    el.innerHTML = html;
    el.classList.remove('page-fade');
    if (cb) cb();
  }, 120);
}

function renderMainPage() {
  activeCategory = 'all';
  currentProducts = sortByDateDesc(products.slice());
  currentPage = 1;
  currentView = 'categories';
  showBanner();
  var s = document.getElementById('search'); if (s) s.style.display = 'block';
  _renderGrid();
  window.scrollTo({top:0,behavior:'instant'});
  // Фоновая предзагрузка первых фото после рендера
  setTimeout(function() {
    currentProducts.slice(0, 10).forEach(function(p) {
      var ph = getPhotosArray(p);
      if (ph.length > 0) _preloadImage(ph[0]);
    });
  }, 100);
}
// ─────────────────────────────────────────────────────────────────
// Иконки категорий — константа уровня модуля, создаётся один раз
// ─────────────────────────────────────────────────────────────────
var _CHIP_ICONS = {
  "Оптика / Прицелы":               "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_optics.png?v=1",
  "Квадрокоптеры / FPV / БПЛА":     "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_quadcopter.png?v=1",
  "НСУ / Ретрансляторы":            "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_nsu.png?v=1",
  "Комплектующие для БПЛА":         "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_parts.png?v=1",
  "Электростанции / Генераторы":    "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_generator.png?v=1",
  "Броня / Экипировка":             "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_armor.png?v=1",
  "Мото / Квадроциклы":             "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_moto.png?v=1",
  "Усилители сигнала / Инкубаторы": "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_signal.png?v=1",
  "Рации":                          "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_radio.png?v=1",
  "Детекторы БПЛА":                 "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_detector.png?v=1",
  "РЭБ":                            "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_reb.png?v=1",
  "Гаджеты":                        "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_gadget.png?v=1",
  "Смартчасы":                      "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_watch.png?v=1",
  "Спутниковый интернет":           "https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/category_satellite.png?v=1"
};

function _renderGrid() {
  var b = document.getElementById('categories'); if (!b) return;
  // Баннер: показываем только на главной
  if (activeCategory === 'all') { showBanner(); } else { hideBanner(); }
  // Карусель видна только на главной без активного поиска
  var sq = document.getElementById('search');
  var showCarousel = (activeCategory === 'all') && !(sq && sq.value.trim().length > 0);

  var h = '';
  if (showCarousel) {
    h += '<div class="categories-carousel">';
    categoriesList.forEach(function(cat){
      var cnt = products.filter(function(p){ return p.category===cat; }).length;
      var active = activeCategory===cat ? ' active' : '';
      var _chipIcon = _CHIP_ICONS[cat] ? '<img src="' + _CHIP_ICONS[cat] + '" class="chip-icon">' : '';
      h += '<div class="category-chip' + active + '" data-cat="' + cat.replace(/'/g,"\\'") + '" onclick="setCategory(\'' + cat.replace(/'/g,"\\'") + '\',this)">' + _chipIcon + cat.split(' / ')[0] + ' (' + cnt + ')</div>';
    });
    h += '</div>';
  }
  h += '<div class="products-grid" id="productsGrid">';
  currentProducts.slice(0, perPage).forEach(function(p, i){ h += renderProductGridCard(p, i < 6); });
  h += '</div>';
  if (currentProducts.length > perPage) {
    h += '<div id="showMoreContainer" style="text-align:center;padding:10px;"><button id="showMoreBtn" onclick="loadMore()" style="width:100%;padding:14px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:16px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_add.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Показать ещё (' + (currentProducts.length-perPage) + ')</button></div>';
  }

  _fadeSwap(b, h, function() {
    _syncBackBtn();
    _updateClearBtn();
    requestAnimationFrame(function(){ setupPhotoSwipe(); bindCardClicks(); renderBottomNav(); _updateClearBtn(); });
  });
  // Фоновая предзагрузка первых фото текущей порции
  setTimeout(function() {
    currentProducts.slice(0, perPage).forEach(function(p) {
      var ph = getPhotosArray(p);
      if (ph.length > 0) _preloadImage(ph[0]);
    });
  }, 100);
  // Скролл намеренно НЕ вызывается здесь — каждый вызывающий контекст
  // управляет позицией сам (renderMainPage, setCategory, renderCatalog,
  // кнопка «Назад» в карточке товара).
}


// ─────────────────────────────────────────────────────────────────
//  _renderGridRestored — используется ТОЛЬКО при возврате из карточки.
//  Рисует сразу все товары до loadedCount (все страницы «Показать ещё»
//  уже раскрыты), затем показывает кнопку с остатком, если есть.
function _renderGridRestored(loadedCount) {
  var b = document.getElementById('categories'); if (!b) return;
  var count = Math.min(loadedCount, currentProducts.length);
  if (count < perPage) count = Math.min(perPage, currentProducts.length);
  // Баннер: показываем только на главной
  if (activeCategory === 'all') { showBanner(); } else { hideBanner(); }
  // Карусель видна только на главной без активного поиска
  var sq = document.getElementById('search');
  var showCarousel = (activeCategory === 'all') && !(sq && sq.value.trim().length > 0);

  var h = '';
  if (showCarousel) {
    h += '<div class="categories-carousel">';
    categoriesList.forEach(function(cat){
      var cnt = products.filter(function(p){ return p.category===cat; }).length;
      var active = activeCategory===cat ? ' active' : '';
      var _chipIcon = _CHIP_ICONS[cat] ? '<img src="' + _CHIP_ICONS[cat] + '" class="chip-icon">' : '';
      h += '<div class="category-chip' + active + '" data-cat="' + cat.replace(/'/g,"\\'") + '" onclick="setCategory(\'' + cat.replace(/'/g,"\\'") + '\',this)">' + _chipIcon + cat.split(' / ')[0] + ' (' + cnt + ')</div>';
    });
    h += '</div>';
  }
  h += '<div class="products-grid" id="productsGrid">';
  currentProducts.slice(0, count).forEach(function(p){ h += renderProductGridCard(p); });
  h += '</div>';
  if (currentProducts.length > count) {
    h += '<div id="showMoreContainer" style="text-align:center;padding:10px;"><button id="showMoreBtn" onclick="loadMore()" style="width:100%;padding:14px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:16px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_add.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Показать ещё (' + (currentProducts.length-count) + ')</button></div>';
  }

  // currentPage выставляем так, чтобы следующий loadMore() взял правильный offset
  currentPage = Math.ceil(count / perPage);

  _fadeSwap(b, h, function() {
    _syncBackBtn();
    _updateClearBtn();
    requestAnimationFrame(function(){ setupPhotoSwipe(); bindCardClicks(); renderBottomNav(); _updateClearBtn(); });
  });
  // Скролл — снаружи
}

// Фильтр по категории (п.4) — вызывает _renderGrid, НЕ renderMainPage
function setCategory(cat, el) {
  activeCategory = cat;
  currentView = 'categories';
  hideBanner();
  document.querySelectorAll('.category-chip').forEach(function(c){ c.classList.remove('active'); });
  if (el) el.classList.add('active');
  currentProducts = sortByDateDesc(products.filter(function(p){ return p.category === cat; }));
  currentPage = 1;
  _renderGrid();
  window.scrollTo({top:0,behavior:'instant'});
  var sq = document.getElementById('search');
  if (sq && sq.value.trim()) renderCatalog();
}

// Поиск (п.3) — вызывает _renderGrid, НЕ renderMainPage
function renderCatalog() {
  var el = document.getElementById('search');
  var q = el ? el.value.toLowerCase().trim() : '';
  var source = activeCategory==='all' ? products : products.filter(function(p){ return p.category===activeCategory; });
  if (q) {
    var words = q.split(/\s+/).filter(Boolean);
    currentProducts = source.filter(function(p){
      if (!p.title) return false;
      var t = p.title.toLowerCase();
      for (var i=0;i<words.length;i++) if (t.indexOf(words[i])===-1) return false;
      return true;
    });
  } else {
    currentProducts = sortByDateDesc(source.slice());
  }
  currentPage = 1;
  _renderGrid();
  window.scrollTo({top:0,behavior:'instant'});
}

function loadMore() {
  currentPage++;
  var st=(currentPage-1)*perPage, en=Math.min(currentPage*perPage, currentProducts.length);
  var g=document.getElementById('productsGrid'); if(!g) return;
  for(var i=st;i<en;i++) g.insertAdjacentHTML('beforeend', renderProductGridCard(currentProducts[i]));
  if(en>=currentProducts.length){ var c=document.getElementById('showMoreContainer'); if(c) c.remove(); }
  else { var btn=document.getElementById('showMoreBtn'); if(btn) btn.innerHTML='<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_add.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Показать ещё ('+(currentProducts.length-en)+')'; }
  requestAnimationFrame(function(){ setupPhotoSwipe(); bindCardClicks(); });
}

// ─────────────────────────────────────────────────────────────────
//  СВАЙП ФОТО В СЕТКЕ (п.6)
//
//  В карусели Популярного (.popular-card-photo) горизонтальный свайп
//  по фото конфликтует со скроллом самой карусели.
//  Решение: touchmove passive:false + e.preventDefault() только когда
//  жест горизонтальный — это блокирует scroll карусели, но не мешает
//  вертикальному скроллу страницы.
// ─────────────────────────────────────────────────────────────────
function setupPhotoSwipe(c) {
  (c||document).querySelectorAll(".product-grid-card .card-photo-container img.card-photo, .popular-card .card-photo").forEach(function(img){
    if (img.dataset.swipeReady==="1") return; img.dataset.swipeReady="1";
    var cont=img.parentElement, photos;
    try { photos=JSON.parse(decodeURIComponent(img.dataset.photos)); } catch(e){ photos=[img.src]; }
    if (!photos||photos.length<=1) return;
    var cp=0, sx=0, sy=0, isHoriz=false, tracking=false;
    // Определяем в touchmove направление жеста — блокируем карусель
    // только если свайп горизонтальный. passive:false обязателен для preventDefault.
    cont.addEventListener("touchstart",function(e){
      sx=e.touches[0].clientX; sy=e.touches[0].clientY;
      isHoriz=false; tracking=true;
    },{passive:true});
    cont.addEventListener("touchmove",function(e){
      if (!tracking) return;
      var dx=Math.abs(e.touches[0].clientX-sx);
      var dy=Math.abs(e.touches[0].clientY-sy);
      if (dx>5||dy>5) {
        isHoriz=dx>dy;
        tracking=false; // направление определено, больше не пересчитываем
      }
      // Блокируем нативный горизонтальный скролл карусели
      if (isHoriz) e.preventDefault();
    },{passive:false});
    cont.addEventListener("touchend",function(e){
      if (!isHoriz) return;
      var dx=sx-e.changedTouches[0].clientX, dy=sy-e.changedTouches[0].clientY;
      if (Math.abs(dx)<35) return;
      cp=dx>0?(cp+1)%photos.length:(cp-1+photos.length)%photos.length;
      // Мгновенная смена в сетке
      img.src = photos[cp];
      cont.querySelectorAll(".card-dots span").forEach(function(d,i){ d.style.background=i===cp?'#f5c96a':'rgba(255,255,255,0.5)'; });
      // Предзагрузка соседних
      var nxtCp = (cp + 1) % photos.length;
      var prvCp = (cp - 1 + photos.length) % photos.length;
      (new Image()).src = photos[nxtCp];
      (new Image()).src = photos[prvCp];
    });
  });
}

// ─────────────────────────────────────────────────────────────────
//  КЛИКИ ПО КАРТОЧКАМ
// ─────────────────────────────────────────────────────────────────
function bindCardClicks(c) {
  (c||document).querySelectorAll(".product-grid-card").forEach(function(card){
    if (card.dataset.clickReady==="1") return; card.dataset.clickReady="1";
    card.addEventListener("click",function(e){
      if (e.target.closest(".fav-star")) return;
      var pid=parseInt(card.dataset.id); if(pid) openProductCard(pid);
    });
  });
  (c||document).querySelectorAll(".fav-star").forEach(function(star){
    star.addEventListener("click",function(e){
      e.stopPropagation(); e.preventDefault();
      var pid=parseInt(star.dataset.id);
      if(pid){ toggleFav(pid); updateFavStar(pid); }
    });
  });
}

function updateFavStar(pid) {
  var fid=isFav(pid);
  document.querySelectorAll('.fav-star[data-id="'+pid+'"]').forEach(function(el){
    el.innerHTML=fid?'<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_filled.png?v=1" style="width:18px;height:18px;vertical-align:middle;">':'<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/star_empty.png?v=1" style="width:18px;height:18px;vertical-align:middle;">'; el.style.color=fid?'#f5c96a':'rgba(255,255,255,0.5)';
  });
  saveFavs();
}

// ─────────────────────────────────────────────────────────────────
//  КНОПКА «←» ПЕРЕД СТРОКОЙ ПОИСКА
//  Вставляет кнопку возврата на главную перед #searchWrap в DOM,
//  чтобы визуальный порядок был: кнопка → поиск → сетка товаров.
//  При activeCategory='all' — удаляет кнопку если она была.
// ─────────────────────────────────────────────────────────────────
function _syncBackBtn() {
  var wrap = document.getElementById('searchWrap');
  if (!wrap) return;
  // Удаляем старую кнопку если есть
  var old = document.getElementById('catBackBtn');
  if (old) old.parentNode.removeChild(old);
  if (activeCategory === 'all') return; // на главной кнопка не нужна
  // Создаём кнопку и вставляем перед searchWrap
  var btn = document.createElement('div');
  btn.id = 'catBackBtn';
  btn.onclick = goHome;
  btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;margin:10px 12px 4px;cursor:pointer;';
  btn.innerHTML = '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon">';
  wrap.parentNode.insertBefore(btn, wrap);
}

// ─────────────────────────────────────────────────────────────────
//  КРЕСТИК ОЧИСТКИ ПОИСКА (п.7)
// ─────────────────────────────────────────────────────────────────
function _updateClearBtn() {
  var btn=document.getElementById('searchClearBtn');
  var inp=document.getElementById('search');
  if (!btn||!inp) return;
  btn.style.display=inp.value.length>0?'flex':'none';
}

function clearSearch() {
  var inp=document.getElementById('search');
  if (inp){ inp.value=''; inp.focus(); }
  _updateClearBtn();
  renderCatalog();
}

// ─────────────────────────────────────────────────────────────────
//  КЛАВИАТУРА СКРЫВАЕТСЯ ПРИ ПЕРВОМ СКРОЛЛЕ (п.8)
// ─────────────────────────────────────────────────────────────────
document.addEventListener('touchstart', function(e) {
  var active = document.activeElement;
  if (!active || (active.tagName!=='INPUT' && active.tagName!=='TEXTAREA')) return;
  if (!active.contains(e.target)) { active.blur(); _updateClearBtn(); }
}, { passive: true });



// ─────────────────────────────────────────────────────────────────
//  НИЖНЯЯ ПАНЕЛЬ — ПОВЕДЕНИЕ ПРИ КЛАВИАТУРЕ
//  focus на поиске → скрываем панель (opacity:0)
//  Показываем только когда visualViewport вернулся к полному размеру
// ─────────────────────────────────────────────────────────────────
(function() {
  function _getNav() { return document.getElementById('bottomNav'); }
  var _keyboardOpen = false;

  function _showNav() {
    var nav = _getNav(); if (nav) nav.style.opacity = '1';
    _keyboardOpen = false;
  }

  function _onSearchFocus() {
    _keyboardOpen = true;
    var nav = _getNav(); if (nav) nav.style.opacity = '0';
  }

  // Следим за visualViewport — показываем панель только когда
  // viewport полностью восстановился (клавиатура ушла)
  if (window.visualViewport) {
    var _fullHeight = window.visualViewport.height;
    window.visualViewport.addEventListener('resize', function() {
      var vv = window.visualViewport;
      // Обновляем эталонную высоту если клавиатура не открыта
      if (!_keyboardOpen) _fullHeight = vv.height;
      // Показываем панель только когда высота вернулась к эталону
      if (_keyboardOpen && vv.height >= _fullHeight * 0.95) {
        _showNav();
      }
    });
  }

  function _bindSearchNavEvents() {
    var inp = document.getElementById('search');
    if (!inp || inp._navEventsbound) return;
    inp.addEventListener('focus', _onSearchFocus);
    inp._navEventsbound = true;
  }

  var _navObserver = new MutationObserver(function() { _bindSearchNavEvents(); });
  _navObserver.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', _bindSearchNavEvents);
})();