// === app-reviews.js — Отзывы ===

// Состояние пагинации отзывов
var _revAll = [], _revShown = 0, _revContainer = null;

function _revRender() {
  var b = _revContainer; if (!b) return;
  var header = '<div class="page-back-btn" onclick="backToMenu()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
    '<h2 id="revTitle" class="section-title"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/reviews_icon.png?v=1" class="section-icon">Отзывы (' + _revAll.length + ')</h2>';
  if (_revAll.length === 0) {
    b.innerHTML = header + '<div style="text-align:center;padding:30px;opacity:0.7;">Отзывов пока нет</div>';
    renderBottomNav(); return;
  }
  var end = Math.min(_revShown + 10, _revAll.length);
  var out = header;
  _revAll.slice(_revShown, end).forEach(function(rv) {
    var stars = '';
    for (var i = 1; i <= 5; i++) stars += i <= rv.stars ? '⭐' : '☆';
    var photos = rv.photos || [];
    if (typeof photos === 'string') { try { photos = JSON.parse(photos); } catch(e) { photos = []; } }
    if (!Array.isArray(photos)) photos = [];
    out += '<div class="section-card" style="margin:0 10px 10px;">' +
      '<div style="font-weight:bold;color:#fff;margin-bottom:4px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/user.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"> ' + escapeHTML(rv.name || 'Аноним') + '</div>' +
      '<div style="font-size:18px;margin-bottom:6px;">' + stars + '</div>';
    if (photos.length > 0) {
      out += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:8px;">';
      photos.forEach(function(ph) {
        out += '<img src="' + ph + '" loading="lazy" style="height:100px;border-radius:8px;border:1px solid rgba(212,175,55,0.3);flex-shrink:0;">';
      });
      out += '</div>';
    }
    out += '<div style="font-size:14px;color:#ccc;line-height:1.5;">' + escapeHTML(rv.text || '').replace(/\n/g, '<br>') + '</div>' +
      '<div style="font-size:11px;color:#888;margin-top:4px;">' + formatDate(rv.date) + '</div>' +
    '</div>';
  });
  _revShown = end;
  if (_revShown < _revAll.length) {
    out += '<div style="text-align:center;padding:10px;">' +
      '<button onclick="_revRender()" style="width:calc(100% - 20px);padding:12px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;">' +
      '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_add.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Показать ещё (' + (_revAll.length - _revShown) + ')</button></div>';
  }
  b.innerHTML = out;
  var titleEl = document.getElementById('revTitle');
  if (titleEl) titleEl.scrollIntoView({ behavior: 'smooth' });
  renderBottomNav();
}

function showReviews() {
  currentView = 'reviews'; hideBanner();
  var s = document.getElementById('search'); if (s) s.style.display = 'none';
  var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';
  var b = document.getElementById('categories'); if (!b) return;
  b.innerHTML = '<div style="text-align:center;padding:20px;color:#d4af37;">Загрузка отзывов...</div>';

  fetch(REVIEWS_URL + '?select=*&order=date.desc&limit=500', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r){ return r.json(); }).then(function(reviews) {
    if (!Array.isArray(reviews)) reviews = [];
    _revAll = reviews;
    _revShown = 0;
    _revContainer = b;
    _revRender();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }).catch(function(e) {
    b.innerHTML = '<div style="text-align:center;padding:20px;color:#e53935;">Ошибка: ' + e.message + '</div>';
  });
}