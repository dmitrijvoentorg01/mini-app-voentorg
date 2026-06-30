// === app-favorites.js — Избранное и популярное ===

function showPopular() {
  currentView = 'popular'; hideBanner();
  var s = document.getElementById('search'); if (s) s.style.display = 'none';
  var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';
  var b = document.getElementById('categories'); if (!b) return;
  var pop = sortByViews(products.slice().filter(function(p){ return p.views > 0; })).slice(0, 10);

  var h = '<div class="page-back-btn" onclick="backToMenu()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
    '<h2 class="section-title"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/popular.png?v=1" class="section-icon">САМЫЕ ПРОСМАТРИВАЕМЫЕ</h2>';

  if (pop.length === 0) {
    h += '<div style="text-align:center;padding:30px;opacity:0.7;">Нет товаров</div>';
  } else {
    h += '<div class="popular-carousel">';
    pop.forEach(function(p) {
      var ph = getPhotosArray(p);
      h += '<div class="popular-card" data-id="' + p.id + '">' +
        '<div class="popular-card-photo">' +
          (ph[0]
            ? '<img src="' + ph[0] + '" class="card-photo" data-photos="' + encodeURIComponent(JSON.stringify(ph)) + '" loading="lazy">'
            : '<div class="card-no-photo">📷</div>') +
          '<div class="card-hit-badge"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/fire.png?v=1" style="width:12px;height:12px;vertical-align:middle;margin-right:2px;">ТОП</div>' +
        '</div>' +
        '<div style="padding:14px 16px;">' +
          '<div style="font-size:15px;font-weight:bold;color:#fff;margin-bottom:6px;">' + escapeHTML(p.title) + '</div>' +
          '<div style="font-size:20px;font-weight:800;color:#f5c96a;">' + (p.price || '') + '</div>' +
        '</div>' +
      '</div>';
    });
    h += '</div>';
  }

  b.innerHTML = h;
  setTimeout(function() {
    setupPhotoSwipe();
    document.querySelectorAll('.popular-card').forEach(function(c) {
      c.addEventListener('click', function() { openProductCard(parseInt(c.dataset.id)); });
    });
    renderBottomNav();
  }, 80);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showFavorites() {
  currentView = 'favorites'; hideBanner();
  var s = document.getElementById('search'); if (s) s.style.display = 'none';
  var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';
  var b = document.getElementById('categories'); if (!b) return;
  var fp = products.filter(function(p){ return favorites.indexOf(p.id) !== -1; });

  var h = '<div class="page-back-btn" onclick="showCabinetPage()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
    '<h2 class="section-title"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/reviews.png?v=1" class="section-icon">Избранное</h2>';

  if (fp.length === 0) {
    h += '<div style="text-align:center;padding:30px;opacity:0.7;">Нет избранных товаров</div>';
  } else {
    h += '<div class="products-grid">';
    fp.forEach(function(p){ h += renderProductGridCard(p); });
    h += '</div>';
  }

  b.innerHTML = h;
  requestAnimationFrame(function(){ setupPhotoSwipe(); bindCardClicks(); renderBottomNav(); });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showNewItems() {
  currentView = 'new_items'; hideBanner();
  var s = document.getElementById('search'); if (s) s.style.display = 'none';
  var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';
  var b = document.getElementById('categories'); if (!b) return;
  var np = products.filter(function(p){ return isNew(p); });

  var h = '<div class="page-back-btn" onclick="backToMenu()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
    '<h2 class="section-title"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/new_items.png?v=1" class="section-icon">Новинки</h2>';

  if (np.length === 0) {
    h += '<div style="text-align:center;padding:30px;opacity:0.7;">Новых товаров пока нет</div>';
  } else {
    h += '<div class="products-grid">';
    np.slice(0, 20).forEach(function(p){ h += renderProductGridCard(p); });
    h += '</div>';
  }

  b.innerHTML = h;
  requestAnimationFrame(function(){ setupPhotoSwipe(); bindCardClicks(); renderBottomNav(); });
  window.scrollTo({ top: 0, behavior: 'instant' });
}