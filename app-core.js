// === app-core.js ===

var tg = window.Telegram?.WebApp;
var currentTelegramId = '';
var isAdmin = false;
if (tg) {
  tg.ready(); tg.expand();
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
  if (tg.initDataUnsafe?.user) {
    currentTelegramId = String(tg.initDataUnsafe.user.id);
    isAdmin = ADMIN_IDS.indexOf(currentTelegramId) !== -1;
    // Сохраняем в localStorage для защиты от потери при навигации
    try {
      localStorage.setItem('voentorg_tg_id', currentTelegramId);
      localStorage.setItem('voentorg_is_admin', isAdmin ? 'true' : 'false');
    } catch(e) {}
  } else {
    // Fallback: берём из localStorage если Telegram не передал данные
    try {
      var _storedId = localStorage.getItem('voentorg_tg_id');
      if (_storedId) {
        currentTelegramId = _storedId;
        isAdmin = localStorage.getItem('voentorg_is_admin') === 'true';
      }
    } catch(e) {}
  }
}
// Глобальная вибрация при кликах на кликабельные элементы
document.addEventListener('click', function(e) {
  try {
    if (!tg) return;
    var el = e.target;
    var selector = 'button, .product-grid-card, .menu-card, .category-chip, .popular-card, .list-item, .section-card, .nav-item, [onclick]';
    var found = el.closest ? el.closest(selector) : null;
    if (!found && el.matches && el.matches(selector)) found = el;
    if (found) {
      tg.HapticFeedback && tg.HapticFeedback.impactOccurred && tg.HapticFeedback.impactOccurred('light');
    }
  } catch(e) {}
});

if (currentTelegramId && currentTelegramId !== '7135981223') {
  var tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user;
  // Прямая запись события в таблицу visits (вместо Edge Function track)
  fetch('https://wwhpxpxflkbrlhbarqmx.supabase.co/rest/v1/visits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    },
    body: JSON.stringify({
      telegram_id: currentTelegramId,
      first_name: tgUser ? (tgUser.first_name || '') : '',
      username: tgUser ? (tgUser.username || '') : '',
      event: 'visit',
      created_at: new Date().toISOString()
    })
  }).catch(function(){});

  // UPSERT клиента: проверяем, есть ли запись, если нет — создаём
  try {
    if (typeof CLIENTS_URL !== 'undefined' && typeof getHeaders === 'function') {
      (function() {
        var _tid = currentTelegramId;
        var _fn  = tgUser ? (tgUser.first_name || '') : '';
        var _un  = tgUser ? (tgUser.username  || '') : '';
        fetch(CLIENTS_URL + '?telegram_id=eq.' + _tid + '&select=id', {
          headers: getHeaders()
        }).then(function(r) { return r.json(); }).then(function(rows) {
          if (Array.isArray(rows) && rows.length > 0) return; // клиент уже есть
          return fetch(CLIENTS_URL, {
            method:  'POST',
            headers: getHeaders(),
            body:    JSON.stringify({
              telegram_id:       _tid,
              first_name:        _fn,
              username:          _un,
              total_orders:      0,
              successful_orders: 0,
              failed_attempts:   0,
              created_at:        new Date().toISOString()
            })
          });
        }).catch(function(){});
      })();
    }
  } catch(e) {}
}

var allProducts = [];
var products = [];
var categoriesList = [];
var activeCategory = 'all';
var currentProducts = [];
var currentPage = 1;
var currentView = 'categories';
var maintenanceMode = false;
var favorites = JSON.parse(localStorage.getItem('voentorg_fav') || '[]');

function saveFavs() { localStorage.setItem('voentorg_fav', JSON.stringify(favorites)); }
function isFav(pid) { return favorites.indexOf(pid) !== -1; }
function toggleFav(pid) {
  var i = favorites.indexOf(pid);
  i === -1 ? favorites.push(pid) : favorites.splice(i, 1);
  saveFavs();
}

function showBanner() {
  var b = document.querySelector('.brand-banner'); if (b) { b.style.opacity = '1'; b.style.pointerEvents = ''; b.style.height = ''; }
  var bb = document.getElementById('brandBanner'); if (bb) { bb.style.opacity = '1'; bb.style.pointerEvents = ''; bb.style.height = ''; }
}
function hideBanner() {
  var b = document.querySelector('.brand-banner'); if (b) { b.style.opacity = '0'; b.style.pointerEvents = 'none'; b.style.height = '0'; }
  var bb = document.getElementById('brandBanner'); if (bb) { bb.style.opacity = '0'; bb.style.pointerEvents = 'none'; bb.style.height = '0'; }
}

async function checkMaintenance() {
  await loadMaintenanceMode();
  if (maintenanceMode && !isAdmin) {
    document.getElementById('maintenanceOverlay').style.display = 'flex';
    var sp = document.getElementById('splash');
    if (sp) { sp.style.opacity = '0'; sp.style.visibility = 'hidden'; setTimeout(function(){ sp.remove(); }, 500); }
    return true;
  }
  return false;
}

async function loadAllProducts() {
  var all = [], from = 0, limit = 50;
  while (true) {
    var r = await fetch(SUPABASE_URL + '?select=id,title,price,category,photos,description,views,date,status,stock,sizes,colors&order=id.desc&limit=' + limit + '&offset=' + from, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (!r.ok) break;
    var d = await r.json();
    if (!d || d.length === 0) break;
    all = all.concat(d);
    if (d.length < limit) break;
    from += limit;
  }
  return all;
}

// ─────────────────────────────────────────────────────────────────
// resolveCategory: нормализует строку категории и проверяет её
// по эталонному whitelist CATEGORIES.
//
// Whitelist-подход гарантирует: в p.category попадает ТОЛЬКО строка,
// которая буквально === одной из CATEGORIES. Никаких «почти совпадений»,
// никаких невидимых символов, никаких грязных данных из базы.
//
// Если категория не найдена в CATEGORIES — возвращает null,
// и товар полностью отбрасывается из products.
// ─────────────────────────────────────────────────────────────────
function resolveCategory(raw) {
  if (!raw || typeof raw !== 'string') return null;
  // Убираем невидимые символы, которые /\s/ не матчит (U+200B и др.)
  var n = raw
    .replace(/[\u0000-\u001f\u00ad\u200b-\u200f\u2028-\u202f\u205f-\u206f\ufeff]/g, '')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n) return null;
  // Инфо обрабатывается отдельно (не в whitelist, не в products)
  if (n === 'Инфо' || n.toLowerCase() === 'инфо') return 'Инфо';
  // Ищем точное совпадение в эталонном списке
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i] === n) return CATEGORIES[i];
  }
  return null; // не в whitelist — отбрасываем
}

// ─────────────────────────────────────────────────────────────────
//  Кеш товаров в localStorage (10 минут)
// ─────────────────────────────────────────────────────────────────
var CACHE_KEY = 'voentorg_products_cache';
var CACHE_TTL = 60 * 60 * 1000; // 60 минут

function _saveProductsCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
  } catch(e) {}
}

function _loadProductsCache() {
  try {
    var raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (!obj || !obj.data || (Date.now() - obj.ts) > CACHE_TTL) return null;
    return obj.data;
  } catch(e) { return null; }
}

function _applyProducts(d) {
  allProducts = d;
  products = [];
  d.forEach(function(p) {
    var resolved = resolveCategory(p.category);
    if (!resolved || resolved === 'Инфо') return;
    p.category = resolved;
    products.push(p);
  });
  categoriesList = CATEGORIES.filter(function(cat) {
    return products.some(function(p) { return p.category === cat; });
  });
  currentProducts = sortByDateDesc(products.slice());
}

async function loadProducts() {
  try {
    var maint = await checkMaintenance(); if (maint) return;

    var cached = _loadProductsCache();
    if (cached) {
      // Есть свежий кеш — рендерим мгновенно
      _applyProducts(cached);
      renderMainPage();
      var sp = document.getElementById('splash');
      if (sp) { sp.style.opacity = '0'; sp.style.visibility = 'hidden'; setTimeout(function(){ sp.remove(); }, 300); }
      // Фоновое обновление — обновляем данные и кеш без перерендера
      loadAllProducts().then(function(d) {
        _saveProductsCache(d);
        _applyProducts(d);
      }).catch(function(){
        // Нет сети — работаем с кешем, тихо игнорируем
      });
    } else {
      // Нет кеша — грузим как обычно
      try {
        var d = await loadAllProducts();
        _saveProductsCache(d);
        _applyProducts(d);
        renderMainPage();
        var sp = document.getElementById('splash');
        if (sp) { sp.style.opacity = '0'; sp.style.visibility = 'hidden'; setTimeout(function(){ sp.remove(); }, 500); }
      } catch(netErr) {
        // Ошибка сети — показываем сообщение пользователю
        var sp = document.getElementById('splash'); if (sp) sp.remove();
        var b = document.getElementById('categories');
        if (b) b.innerHTML =
          '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
          'height:70vh;text-align:center;padding:32px;">' +
          '<div style="font-size:48px;margin-bottom:16px;">📡</div>' +
          '<div style="font-size:18px;font-weight:bold;color:#e53935;margin-bottom:12px;">Нет соединения</div>' +
          '<div style="font-size:14px;color:#888;margin-bottom:24px;">Проверьте интернет и попробуйте снова</div>' +
          '<button onclick="location.reload()" style="padding:14px 32px;background:#000;color:#d4af37;' +
          'border:2px solid #d4af37;border-radius:12px;font-weight:bold;font-size:15px;cursor:pointer;">🔄 Повторить</button>' +
          '</div>';
      }
    }
  } catch(e) {
    var sp2 = document.getElementById('splash'); if (sp2) sp2.remove();
    var b2 = document.getElementById('categories');
    if (b2) b2.innerHTML = '<div style="text-align:center;padding:40px;color:#e53935;">❌ Ошибка: ' + e.message + '</div>';
  }
}

// Если currentTelegramId всё ещё пустой — показываем экран ошибки
if (!currentTelegramId) {
  document.addEventListener('DOMContentLoaded', function() {
    var root = document.getElementById('categories') || document.body;
    root.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'height:80vh;text-align:center;padding:32px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">⚠️</div>' +
      '<div style="font-size:18px;font-weight:bold;color:#e53935;margin-bottom:12px;">' +
      'Пользователь не определён</div>' +
      '<div style="font-size:14px;color:#888;">Перезапустите приложение.</div>' +
      '</div>';
    var sp = document.getElementById('splash'); if (sp) sp.remove();
  });
} else {
  // setTimeout(0) гарантирует что app-render.js загружен до вызова renderMainPage
  setTimeout(function() { loadProducts(); }, 0);
}

// Обновление данных при возврате в приложение из фона
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible') return;
  // Только фоновое обновление кеша — без перерендера страницы
  loadAllProducts().then(function(d) {
    _saveProductsCache(d);
    _applyProducts(d);
  }).catch(function() {});
});
