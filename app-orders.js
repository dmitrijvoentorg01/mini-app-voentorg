// === app-orders.js — Заказы ===

// ── Состояние пошаговой формы ──
var _orderState = {};

function sendNotify(data) {
  fetch('https://wwhpxpxflkbrlhbarqmx.supabase.co/functions/v1/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sb_publishable_Fzk6Y9w1V3DOZ0Opn4m4lw_pynygFV8' },
    body: JSON.stringify(data)
  }).catch(function(){});
}

function isWorkingHours() {
  var now = new Date();
  // Москва UTC+3 — берём UTC-часы и прибавляем 3
  var utcHours = now.getUTCHours();
  var mskHours = (utcHours + 3) % 24;
  return mskHours >= 9 && mskHours < 22;
}

function showNonWorkingHoursWarning(callback) {
  var m = document.getElementById('modal');
  var mc = document.getElementById('modalContent');
  if (!mc || !m) { callback(); return; }
  var mClose = document.getElementById('closeModal');
  if (mClose) mClose.style.display = 'none';
  m.style.display = 'block';
  m.style.zIndex = '10001';
  document.body.style.overflow = 'hidden';
  mc.innerHTML =
    '<div style="text-align:center;padding:20px;">' +
      '<div style="margin-bottom:12px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_waiting.png?v=1" style="width:48px;height:48px;vertical-align:middle;"></div>' +
      '<div style="font-size:16px;font-weight:bold;color:#f5c96a;margin-bottom:8px;">Нерабочее время</div>' +
      '<div style="font-size:13px;color:#ccc;line-height:1.6;margin-bottom:16px;">Рабочее время: ежедневно с 9:00 до 22:00 по Москве.<br>Вы можете оформить заказ сейчас, но реквизиты для оплаты будут отправлены в рабочее время.</div>' +
      '<button class="btn-gold" style="width:100%;" id="warningContinue">Продолжить оформление</button>' +
      '<button class="btn-gold" style="width:100%;margin-top:8px;background:#333;color:#888;border-color:#555;" id="warningCancel">Отмена</button>' +
    '</div>';
  document.getElementById('warningContinue').onclick = function() {
    m.style.display = 'none';
    document.body.style.overflow = '';
    if (mClose) mClose.style.display = '';
    callback();
  };
  document.getElementById('warningCancel').onclick = function() {
    m.style.display = 'none';
    document.body.style.overflow = '';
    if (mClose) mClose.style.display = '';
  };
}

function openOrderForm(pid, quantity) {
  if (!isWorkingHours()) {
    showNonWorkingHoursWarning(function() {
      _continueOrderForm(pid, quantity);
    });
    return;
  }
  _continueOrderForm(pid, quantity);
  return;
}

function _continueOrderForm(pid, quantity) {
  var p = allProducts.find(function(x){ return x.id === pid; }) || products.find(function(x){ return x.id === pid; });
  if (!p) return;
  if (!currentTelegramId) {
    _doOpenOrderForm(p, quantity); return;
  }
  // Проверяем blocked_until у клиента
  var CLIENTS_CHECK = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/rest/v1/clients';
  fetch(CLIENTS_CHECK + '?select=blocked_until&telegram_id=eq.' + currentTelegramId, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r){ return r.json(); }).then(function(rows) {
    var cl = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (cl && cl.blocked_until && new Date(cl.blocked_until) > new Date()) {
      alert('<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_cancelled.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Вы заблокированы за создание заказов без оплаты. Для решения вопроса обратитесь к администратору.');
      return;
    }
    // Считаем неоплаченные отменённые заказы (archived != true)
    fetch(ORDERS_URL + '?select=id,archived&telegram_id=eq.' + currentTelegramId + '&status=eq.Отменён&archived=neq.true&limit=100', {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    }).then(function(r2){ return r2.json(); }).then(function(cancelled) {
      if (!Array.isArray(cancelled)) cancelled = [];
      if (cancelled.length >= 3) {
        alert('<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_cancelled.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Вы заблокированы за создание заказов без оплаты. Для решения вопроса обратитесь к администратору.');
        return;
      }
      _doOpenOrderForm(p, quantity);
    }).catch(function() { _doOpenOrderForm(p, quantity); });
  }).catch(function() { _doOpenOrderForm(p, quantity); });
} // конец _continueOrderForm

function _doOpenOrderForm(p, quantity) {
  _orderState = { pid: p.id, step: 1, delivery_method: '', carrier: '', name: '', city: '', street: '', house: '', phone: '', payment: '', bank: '', quantity: (quantity && quantity > 0 ? parseInt(quantity, 10) : 1) };
  _renderOrderStep(p);
}

function _renderOrderStep(p) {
  var m = document.getElementById('modal');
  var mc = document.getElementById('modalContent');
  if (!mc || !m) return;

  m.style.display = 'block';
  m.style.zIndex = '10001';
  document.body.style.overflow = 'hidden';
  var mClose = document.getElementById('closeModal');
  if (mClose) {
    mClose.innerHTML = '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/close_zoom.png?v=1" class="zoom-close-icon">';
    mClose.onclick = function() { m.style.display = 'none'; document.body.style.overflow = ''; };
  }

  var step = _orderState.step;
  var totalSteps = 9;

  var progressHTML =
    '<div style="margin-bottom:16px;">' +
      '<div style="font-size:12px;color:#888;margin-bottom:4px;">Шаг ' + step + ' из ' + totalSteps + '</div>' +
      '<div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;">' +
        '<div style="height:100%;width:' + Math.round(step/totalSteps*100) + '%;background:#d4af37;border-radius:2px;transition:width 0.3s;"></div>' +
      '</div>' +
    '</div>';

  var productHTML =
    '<div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:10px;padding:10px;margin-bottom:14px;text-align:center;">' +
      '<div style="font-size:13px;color:#aaa;">Товар:</div>' +
      '<div style="font-weight:bold;color:#fff;font-size:14px;">' + escapeHTML(p.title) + '</div>' +
      '<div style="color:#f5c96a;font-size:16px;font-weight:800;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/price.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:2px;"> ' + (p.price || '') + '</div>' +

    '</div>';

  var bodyHTML = '';

  if (step === 1) {
    var _st = (p.stock !== undefined && p.stock !== null) ? parseInt(p.stock, 10) : 1;
    if (isNaN(_st)) _st = 1;
    var _qty = (_orderState.quantity && _orderState.quantity > 0) ? parseInt(_orderState.quantity, 10) : 1;
    var qtyBlock = '';
    if (_st > 1) {
      qtyBlock =
        '<div style="margin-bottom:14px;">' +
          '<div style="color:#aaa;font-size:13px;margin-bottom:8px;">Количество:</div>' +
          '<div style="display:inline-flex;align-items:center;border:2px solid #d4af37;border-radius:10px;overflow:hidden;">' +
            '<button onclick="(function(){var q=Math.max(1,(_orderState.quantity||1)-1);_orderState.quantity=q;document.getElementById(\'orderQtyVal\').textContent=q;})()" style="width:38px;height:38px;background:#000;color:#d4af37;border:none;font-size:22px;font-weight:bold;cursor:pointer;line-height:1;">−</button>' +
            '<span id="orderQtyVal" style="min-width:36px;text-align:center;font-size:16px;font-weight:bold;color:#fff;background:#111;padding:0 6px;line-height:38px;display:inline-block;">' + _qty + '</span>' +
            '<button onclick="(function(){var q=Math.min(' + _st + ',(_orderState.quantity||1)+1);_orderState.quantity=q;document.getElementById(\'orderQtyVal\').textContent=q;})()" style="width:38px;height:38px;background:#000;color:#d4af37;border:none;font-size:22px;font-weight:bold;cursor:pointer;line-height:1;">+</button>' +
          '</div>' +
        '</div>';
    }
    bodyHTML =
      qtyBlock +
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_delivery.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Способ получения</h3>' +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        _orderOptionBtn('delivery_method', 'Доставка', '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_tk.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Доставка ТК') +
        _orderOptionBtn('delivery_method', 'Самовывоз', '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_pickup.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Самовывоз (связаться с админом)') +
      '</div>';

  } else if (step === 2) {
    var isMoto = (p.category === 'Мото / Квадроциклы');
    var carriers = isMoto
      ? ['Деловые линии', 'ПЭК', 'СДЭК', '🚛 Доставка машиной поставщика']
      : ['СДЭК', 'Почта России', 'Boxberry', 'DPD', 'Деловые линии', 'ПЭК', 'СберЛогистика', 'Яндекс Доставка', 'Ozon', 'Wildberries'];
    var carrierOpts = carriers.map(function(c) {
      return '<option value="' + c + '"' + (_orderState.carrier === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');
    var step2Title = isMoto ? 'Способ доставки' : 'Транспортная компания';
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_tk.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> ' + step2Title + '</h3>' +
      '<select id="orderCarrier" class="order-input" style="-webkit-appearance:auto;"><option value="">Выберите ТК</option>' + carrierOpts + '</select>' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button><button class="btn-gold order-next-btn" style="flex:1;" onclick="_orderNextCarrier()">Далее →</button></div>';

  } else if (step === 3) {
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_person.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Ваше ФИО</h3>' +
      '<input id="orderName" class="order-input" placeholder="Иванов Иван Иванович" oninput="_titleCase(this)" value="' + escapeHTML(_orderState.name) + '">' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button><button class="btn-gold order-next-btn" style="flex:1;" onclick="_orderNextFromInput(\'name\',\'orderName\')">Далее →</button></div>';

  } else if (step === 4) {
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_location.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Город</h3>' +
      '<input id="orderCity" class="order-input" placeholder="Город" value="' + escapeHTML(_orderState.city) + '">' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button><button class="btn-gold order-next-btn" style="flex:1;" onclick="_orderNextFromInput(\'city\',\'orderCity\')">Далее →</button></div>';

  } else if (step === 5) {
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_location.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Улица</h3>' +
      '<input id="orderStreet" class="order-input" placeholder="Улица" value="' + escapeHTML(_orderState.street) + '">' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button><button class="btn-gold order-next-btn" style="flex:1;" onclick="_orderNextFromInput(\'street\',\'orderStreet\')">Далее →</button></div>';

  } else if (step === 6) {
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_house.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Дом / корпус</h3>' +
      '<input id="orderHouse" class="order-input" placeholder="Дом / корпус" value="' + escapeHTML(_orderState.house) + '">' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button><button class="btn-gold order-next-btn" style="flex:1;" onclick="_orderNextFromInput(\'house\',\'orderHouse\')">Далее →</button></div>';

  } else if (step === 7) {
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_phone.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Номер телефона</h3>' +
      '<input id="orderPhone" class="order-input" type="tel" placeholder="+7 (999) 123-45-67" value="' + escapeHTML(_orderState.phone) + '" oninput="_phoneMask(this)">' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button><button class="btn-gold order-next-btn" style="flex:1;" onclick="_orderNextFromInput(\'phone\',\'orderPhone\')">Далее →</button></div>';

  } else if (step === 8) {
    var payments = ['Карта', 'СБП', 'QR-код'];
    var _payLabels = {
      'Карта': '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_card.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Карта',
      'СБП':   '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_sbp.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> СБП',
      'QR-код':'<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_qr.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> QR-код'
    };
    var payOpts = payments.map(function(pm) {
      return '<option value="' + pm + '"' + (_orderState.payment === pm ? ' selected' : '') + '>' + pm + '</option>';
    }).join('');
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_payment.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Способ оплаты</h3>' +
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
      payments.map(function(pm) {
        var isSelected = _orderState.payment === pm;
        return '<button class="btn-gold' + (isSelected ? ' btn-gold-active' : '') + '" style="width:100%;text-align:left;" onclick="_orderSelectPayment(\'' + pm + '\')">' + (isSelected ? '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_ok.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> ' : '') + _payLabels[pm] + '</button>';
      }).join('') +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button></div>';

  } else if (step === 9) {
    var banks = ['Сбербанк', 'Т-Банк', 'ВТБ', 'Альфа-Банк', 'Газпромбанк', 'Промсвязьбанк', 'Другой банк'];
    var bankOpts = banks.map(function(bk) {
      return '<option value="' + bk + '"' + (_orderState.bank === bk ? ' selected' : '') + '>' + bk + '</option>';
    }).join('');
    bodyHTML =
      '<h3 style="color:#f5c96a;margin-bottom:14px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_ok.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Подтверждение заказа</h3>' +
      '<select id="orderBank" class="order-input" style="-webkit-appearance:auto;"><option value="">Выберите свой банк</option>' + bankOpts + '</select>' +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-gold" style="width:auto;padding:10px 16px;font-size:14px;" onclick="_orderBack(' + p.id + ')">← Назад</button><button class="btn-gold order-next-btn" style="flex:1;background:#000;color:#d4af37;border:2px solid #d4af37;" onclick="_orderSubmitFinal()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_order.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Оформить заказ</button></div>';
  }


  mc.innerHTML =
    '<div style="padding:10px;">' +
      progressHTML + productHTML + bodyHTML +
    '</div>';

  setTimeout(function() {
    var inp = mc.querySelector('.order-input');
    if (inp) inp.focus();
  }, 100);
}

function _orderOptionBtn(field, value, label) {
  var isSelected = _orderState[field] === value;
  return '<button class="btn-gold' + (isSelected ? ' btn-gold-active' : '') + '" ' +
    'style="width:100%;text-align:left;" ' +
    'onclick="_orderSelectOption(\'' + field + '\',\'' + value.replace(/'/g,"\\'") + '\')">' +
    (isSelected ? '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_ok.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> ' : '') + label + '</button>';
}

function _orderSelectOption(field, value) {
  _orderState[field] = value;
  var p = products.find(function(x){ return x.id === _orderState.pid; });
  if (!p) return;

  if (field === 'delivery_method') {
    if (value === 'Самовывоз') {
      var m = document.getElementById('modal');
      if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
      var text = 'Здравствуйте!%0A%0AЗаинтересовал товар: ' + encodeURIComponent(p.title) +
        '%0A%F0%9F%92%B0Цена: ' + encodeURIComponent(p.price || '') +
        '%0A%F0%9F%86%94ID: ' + p.id +
        '%0A%0AУточните по наличию%E2%9C%8D%F0%9F%8F%BB';
      window.open('https://t.me/Bezopasnaia_Sdelka?text=' + text, '_blank');
      return;
    }
    _orderState.step = 2;
    _renderOrderStep(p);
  }
}

function _orderNextCarrier() {
  var sel = document.getElementById('orderCarrier');
  var val = sel ? sel.value : '';
  if (!val) return;
  _orderState.carrier = val;
  _orderState.step = 3;
  var p = products.find(function(x){ return x.id === _orderState.pid; });
  if (p) _renderOrderStep(p);
}


function _orderNextPayment() {
  var sel = document.getElementById('orderPayment');
  var val = sel ? sel.value : '';
  if (!val) return;
  _orderState.payment = val;
  _orderState.step = 9;
  var p = products.find(function(x){ return x.id === _orderState.pid; });
  if (p) _renderOrderStep(p);
}

function _orderSelectPayment(val) {
  if (!val) return;
  _orderState.payment = val;
  _orderState.step = 9;
  var p = products.find(function(x){ return x.id === _orderState.pid; });
  if (p) _renderOrderStep(p);
}

function _orderSubmitFinal() {
  var sel = document.getElementById('orderBank');
  var val = sel ? sel.value : '';
  if (!val) return;
  _orderState.bank = val;
  // Блокируем кнопку через event.target
  var btn = event && event.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Отправка...'; }
  var p = products.find(function(x){ return x.id === _orderState.pid; });
  if (p) _submitOrder(p);
}

function _orderNextFromInput(field, inputId) {
  var val = (document.getElementById(inputId) || {}).value || '';
  val = val.trim();
  if (!val) { _shake(inputId); return; }
  _orderState[field] = val;
  var p = products.find(function(x){ return x.id === _orderState.pid; });
  if (!p) return;
  _orderState.step++;
  _renderOrderStep(p);
}

function _orderBack(pid) {
  _orderState.step = Math.max(1, _orderState.step - 1);
  var p = products.find(function(x){ return x.id === pid; });
  if (p) _renderOrderStep(p);
}

// ── Заглавные буквы в каждом слове ФИО ──
function _titleCase(inp) {
  var pos = inp.selectionStart;
  inp.value = inp.value.replace(/(?:^|\s)\S/g, function(ch) { return ch.toUpperCase(); });
  inp.setSelectionRange(pos, pos);
}

// ── Маска телефона ──
function _phoneMask(inp) {
  if (inp.value.replace(/\D/g, '') === '') { inp.value = ''; return; }
  // Сохраняем позицию курсора: считаем цифры до него
  var digitsBeforeCursor = inp.value.slice(0, inp.selectionStart).replace(/\D/g, '').length;
  var v = inp.value.replace(/\D/g, '');
  if (v.startsWith('8')) v = '7' + v.slice(1);
  if (!v.startsWith('7')) v = '7' + v;
  v = v.slice(0, 11);
  var r = '+7';
  if (v.length > 1) r += ' (' + v.slice(1, 4);
  if (v.length >= 4) r += ') ' + v.slice(4, 7);
  if (v.length >= 7) r += '-' + v.slice(7, 9);
  if (v.length >= 9) r += '-' + v.slice(9, 11);
  inp.value = r;
  // Восстанавливаем позицию курсора: проходим по результату, считаем цифры
  var newPos = 0, cnt = 0;
  while (newPos < r.length && cnt < digitsBeforeCursor) {
    if (/\d/.test(r[newPos])) cnt++;
    newPos++;
  }
  if (newPos > r.length) newPos = r.length;
  inp.setSelectionRange(newPos, newPos);
}

// ── Анимация ошибки ──
function _shake(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#e53935';
  setTimeout(function() { el.style.borderColor = ''; }, 1500);
}

// ── Отправка заказа ──
async function _submitOrder(p) {
  var s = _orderState;
  var address = s.delivery_method === 'Самовывоз'
    ? 'Самовывоз'
    : [s.city, s.street, s.house].filter(Boolean).join(', ');

  // payment_method: убираем эмодзи и лишние пробелы
  var paymentStr = (s.payment || '').replace(/💳|📲|🔲/g, '').trim();
  if (s.bank) paymentStr += ' / ' + s.bank;

  // price: оставляем только цифры и точку; умножаем на quantity
  var cleanPrice = (p.price || '').replace(/[^\d.]/g, '') || '0';
  var qty = (s.quantity && s.quantity > 0) ? parseInt(s.quantity, 10) : 1;
  if (qty > 1) {
    var numPrice = parseFloat(cleanPrice) || 0;
    cleanPrice = String(Math.round(numPrice * qty * 100) / 100);
  }

  var payload = {
    client_name:    s.name,
    client_phone:   s.phone,
    client_address: address,
    product_id:     parseInt(p.id, 10),
    product_title:  p.title,
    price:          cleanPrice,
    delivery_type:  s.delivery_method === 'Самовывоз' ? 'Самовывоз' : s.carrier,
    payment_method: paymentStr,
    status:         'Ожидает реквизитов',
    created_at:     new Date().toISOString(),
  };

  payload.telegram_id = String(currentTelegramId || '');

  console.log("tg=" + currentTelegramId);
  console.log(JSON.stringify(payload));

  var mc = document.getElementById('modalContent');
  if (mc) mc.innerHTML = '<div style="text-align:center;padding:30px;color:#d4af37;">⏳ Отправка заказа...</div>';

  try {
    var r = await fetch(ORDERS_URL, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
    var d = null;
    var rawText = await r.text();
    if (rawText && rawText.trim()) { d = JSON.parse(rawText); }
    var newId = null;
    if (d) {
      if (Array.isArray(d) && d.length > 0 && d[0].id) { newId = d[0].id; }
      else if (!Array.isArray(d) && d.id) { newId = d.id; }
    }
    // Если Supabase не вернул тело — запрашиваем последний заказ этого пользователя
    if (!newId && currentTelegramId) {
      try {
        var lr = await fetch(ORDERS_URL + '?select=id&telegram_id=eq.' + currentTelegramId + '&order=id.desc&limit=1', { headers: getHeaders() });
        var ld = await lr.json();
        if (Array.isArray(ld) && ld.length > 0) newId = ld[0].id;
      } catch(_) {}
    }
    if (mc) mc.innerHTML = '<div style="text-align:center;padding:30px;"><div style="margin-bottom:16px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_ok.png?v=1" style="width:48px;height:48px;vertical-align:middle;"></div><div style="color:#f5c96a;font-size:18px;font-weight:bold;margin-bottom:8px;">Заказ оформлен!</div><button class="btn-gold" style="width:100%;" onclick="document.getElementById(\'modal\').style.display=\'none\'">Закрыть</button></div>';
    // UPSERT клиента: увеличиваем total_orders или создаём запись
    if (currentTelegramId) {
      var CLIENTS_URL_C = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/rest/v1/clients';
      var tgUser = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user || {};
      fetch(CLIENTS_URL_C + '?select=id,total_orders&telegram_id=eq.' + currentTelegramId, { headers: getHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(rows) {
          if (Array.isArray(rows) && rows.length > 0) {
            // Клиент существует — увеличиваем total_orders
            var cur = parseInt(rows[0].total_orders, 10) || 0;
            fetch(CLIENTS_URL_C + '?telegram_id=eq.' + currentTelegramId, {
              method: 'PATCH', headers: getHeaders(),
              body: JSON.stringify({ total_orders: cur + 1 })
            }).catch(function() {});
          } else {
            // Клиент не существует — создаём
            fetch(CLIENTS_URL_C, {
              method: 'POST', headers: getHeaders(),
              body: JSON.stringify({
                telegram_id: parseInt(currentTelegramId, 10) || currentTelegramId,
                first_name: tgUser.first_name || '',
                username: tgUser.username || '',
                total_orders: 1,
                failed_attempts: 0,
                successful_orders: 0
              })
            }).catch(function() {});
          }
        }).catch(function() {});
    }
    sendNotify({
      action: 'new_order',
      order_id: newId,
      product_title: p.title,
      price: cleanPrice,
      quantity: qty,
      client_name: s.name,
      client_phone: s.phone,
      delivery_type: payload.delivery_type,
      client_address: address,
      payment_method: paymentStr,
      client_telegram_id: currentTelegramId
    });
  } catch(e) {
    if (mc) mc.innerHTML = '<div style="text-align:center;padding:30px;"><div><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_cancelled.png?v=1" style="width:48px;height:48px;vertical-align:middle;"></div><div style="color:#e53935;">Ошибка: ' + e.message + '</div><div class="page-back-btn" style="margin-top:10px;" onclick="_orderBack(' + p.id + ')"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div></div>';
  }
}

// ── Мои заказы — список ──
function showMyOrders() {
  currentView = 'my_orders'; hideBanner();
  var s = document.getElementById('search'); if (s) s.style.display = 'none';
  var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';
  var b = document.getElementById('categories'); if (!b) return;
  if (!currentTelegramId) {
    b.innerHTML = '<div style="text-align:center;padding:20px;color:#e53935;">Ошибка: пользователь не определён</div>';
    return;
  }
  b.innerHTML = '<div style="text-align:center;padding:20px;color:#d4af37;">Загрузка заказов...</div>';
  fetch(ORDERS_URL + '?select=*&telegram_id=eq.' + currentTelegramId + '&order=id.desc&limit=50', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r){ return r.json(); }).then(function(orders) {
    if (!Array.isArray(orders)) orders = [];
    var h = '<div class="page-back-btn" onclick="showCabinetPage()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
      '<h2 class="section-title"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/orders.png?v=1" class="section-icon">Мои заказы (' + orders.length + ')</h2>';
    if (orders.length === 0) {
      h += '<div style="text-align:center;padding:30px;opacity:0.7;">Заказов пока нет</div>';
    } else {
      orders.forEach(function(o) {
        var sc = getOrderStatusColor(o.status), se = getOrderStatusEmoji(o.status);
        h +=
          '<div class="section-card" style="margin:0 10px 10px;cursor:pointer;" onclick="openOrderPage(' + o.id + ')">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:12px;color:#888;margin-bottom:2px;">Заказ #' + o.id + '</div>' +
                '<div style="font-weight:bold;color:#fff;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHTML((o.product_title||'—').substring(0,45)) + '</div>' +
                '<div style="color:#f5c96a;font-weight:800;font-size:15px;margin-top:2px;">' + (o.price||'—') + '</div>' +
              '</div>' +
              '<div style="flex-shrink:0;text-align:right;">' +
                '<span style="display:inline-block;padding:4px 10px;border-radius:10px;font-size:11px;font-weight:bold;border:2px solid ' + sc + ';color:' + sc + ';background:#000;">' + se + ' ' + o.status + '</span>' +
                '<div style="font-size:11px;color:#888;margin-top:6px;">Подробнее →</div>' +
              '</div>' +
            '</div>' +
            (o.track_number ? '<div style="font-size:13px;color:#4caf50;margin-top:8px;border-top:1px solid rgba(255,255,255,0.07);padding-top:8px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_shipped.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Трек: ' + escapeHTML(String(o.track_number)) + '</div>' : '') +
          '</div>';
      });
    }
    b.innerHTML = h;
    renderBottomNav();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }).catch(function(e) {
    b.innerHTML = '<div style="text-align:center;padding:20px;color:#e53935;">Ошибка: ' + e.message + '</div>';
  });
}

// ── Страница заказа ──
function openOrderPage(orderId) {
  currentView = 'order_detail'; hideBanner();
  var s = document.getElementById('search'); if (s) s.style.display = 'none';
  var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';
  var b = document.getElementById('categories'); if (!b) return;
  b.innerHTML = '<div style="text-align:center;padding:20px;color:#d4af37;">Загрузка...</div>';

  fetch(ORDERS_URL + '?id=eq.' + orderId, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r){ return r.json(); }).then(function(data) {
    if (!Array.isArray(data) || data.length === 0) {
      b.innerHTML = '<div class="page-back-btn" onclick="showMyOrders()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
        '<div style="text-align:center;padding:30px;color:#e53935;">Заказ не найден</div>';
      renderBottomNav(); return;
    }
    var o = data[0];
    var sc = getOrderStatusColor(o.status), se = getOrderStatusEmoji(o.status);

    // Строка детали
    function row(label, value, valueColor, isHtml) {
      if (!value && value !== 0) return '';
      var displayValue = isHtml ? String(value) : escapeHTML(String(value));
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<div style="font-size:13px;color:#888;flex-shrink:0;">' + label + '</div>' +
        '<div style="font-size:14px;color:' + (valueColor || '#fff') + ';font-weight:600;text-align:right;word-break:break-word;max-width:60%;">' + displayValue + '</div>' +
      '</div>';
    }

    // Блок: статус
    var statusBlock =
      '<div style="text-align:center;margin-bottom:14px;">' +
        '<span style="display:inline-block;padding:8px 20px;border-radius:12px;font-size:15px;font-weight:bold;border:2px solid ' + sc + ';color:' + sc + ';background:#000;">' + se + ' ' + escapeHTML(o.status || '') + '</span>' +
      '</div>';

    // Плашка «Ожидает реквизитов» (п.11) + кнопка отмены (п.10)
    var cancelBlock = '';
    if (o.status === 'Ожидает реквизитов') {
      cancelBlock =
        '<div style="background:rgba(255,152,0,0.08);border:1px solid rgba(255,152,0,0.35);border-radius:12px;padding:14px;margin-top:12px;font-size:13px;color:#ff9800;line-height:1.5;">'
        + '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_warning.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Внимание! Не создавайте заказы без намерения оплатить. Система блокирует пользователей за частые неоплаченные заказы.'
        + '</div>'
        + '<button onclick="_cancelOrder(' + o.id + ')" '
          + 'style="margin-top:10px;width:100%;padding:12px;background:#000;color:#e53935;border:2px solid #e53935;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;">'
          + '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_cancelled.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Отменить заказ</button>';
    }

    // Кнопка «Повторить заказ» — если отменён по таймеру (archived === false)
    var repeatBlock = '';
    if (o.status === 'Отменён' && o.archived === false) {
      repeatBlock =
        '<button onclick="_repeatOrder(' + o.id + ')" ' +
          'style="width:100%;padding:14px;background:linear-gradient(135deg,#d4af37,#b8960c);' +
          'color:#000;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:15px;">' +
          '🔄 Повторить заказ</button>';
    }

    // Плашка «Оплачен»
    var paidBanner = '';
    if (o.status === 'Оплачен') {
      paidBanner = '<div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.4);border-radius:12px;padding:14px;margin-bottom:14px;font-size:14px;color:#4caf50;line-height:1.5;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_paid.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Ваш заказ оплачен, ожидайте — в ближайшее время товар будет отправлен.</div>';
    }

    // Плашка «Отправлен» (п.5)
    if (o.status === 'Отправлен') {
      if (o.delivery_type === '🚛 Доставка машиной поставщика') {
        paidBanner = '<div style="background:rgba(33,150,243,0.1);border:1px solid rgba(33,150,243,0.4);border-radius:12px;padding:14px;margin-bottom:14px;font-size:14px;color:#2196F3;line-height:1.5;">🚛 Товар отправлен машиной поставщика, с вами свяжутся для уточнения даты доставки.</div>';
      } else {
        paidBanner = '<div style="background:rgba(33,150,243,0.1);border:1px solid rgba(33,150,243,0.4);border-radius:12px;padding:14px;margin-bottom:14px;font-size:14px;color:#2196F3;line-height:1.5;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_shipped.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Товар отправлен. Отслеживайте посылку по трек-номеру. При поступлении в пункт выдачи заберите в течение 3-х дней.</div>';
      }
    }

    // Плашка «Доставлен» (п.7)
    if (o.status === 'Доставлен') {
      paidBanner = '<div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.4);border-radius:12px;padding:14px;margin-bottom:14px;font-size:14px;color:#4caf50;line-height:1.5;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_delivered.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Ваш товар доставлен в пункт выдачи. Можете забирать в часы работы ПВЗ.</div>';
    }

    // Блок: товар
    var productBlock =
      '<div style="background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.25);border-radius:12px;padding:14px;margin-bottom:14px;">' +
        '<div style="font-size:12px;color:#888;margin-bottom:4px;">Товар</div>' +
        '<div style="font-size:16px;font-weight:bold;color:#fff;line-height:1.35;margin-bottom:6px;">' + escapeHTML(o.product_title || '—') + '</div>' +
        '<div style="font-size:22px;font-weight:800;color:#f5c96a;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/price.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:2px;"> ' + escapeHTML(o.price || '—') + '</div>' +
      '</div>';

    // Детали: получение, адрес, ФИО, телефон, оплата (без даты)
    var detailsRows =
      row('Получение', o.delivery_type === 'Самовывоз'
        ? '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_pickup.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Самовывоз'
        : o.delivery_type === '🚛 Доставка машиной поставщика'
          ? '🚛 Доставка машиной поставщика'
          : ('<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_tk.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Доставка · ' + (o.delivery_type || '—')), null, true) +
      (o.client_address && o.client_address !== 'Самовывоз' ? row('Адрес', o.client_address) : '') +
      row('Покупатель', o.client_name) +
      row('Телефон', o.client_phone) +
      row('Оплата', o.payment_method);

    // Реквизиты + таймер + загрузка чека
    var requisitesBlock = '';
    if (o.status === 'Ожидает оплаты' && o.requisites) {
      // Извлекаем реквизит для копирования — последняя строка после последнего <b>...</b>
      var copyText = (function() {
        var matches = o.requisites.match(/<b>[^<]*<\/b>\s*([^<\n]*)/g);
        if (!matches || !matches.length) return '';
        var last = matches[matches.length - 1];
        var val = last.replace(/<b>[^<]*<\/b>\s*/, '').trim();
        return val;
      })();

      // Тип оплаты → длина таймера
      var pm = o.payment_method || '';
      var pmLeft = (pm.split('/')[0] || '').trim().toLowerCase();
      var timerSec = pmLeft.indexOf('qr') !== -1 ? 15 * 60 : 20 * 60;

      requisitesBlock =
        '<div id="reqBlock" style="background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.3);border-radius:12px;padding:14px;margin-top:12px;">' +
          '<div style="font-size:13px;color:#d4af37;font-weight:700;margin-bottom:8px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_waiting.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Реквизиты для оплаты</div>' +
          '<div style="font-size:14px;color:#fff;line-height:1.6;">' + o.requisites + '</div>' +
          (copyText
            ? '<button onclick="_copyRequisite(this,\'' + copyText.replace(/'/g, "\\'") + '\')" style="margin-top:10px;width:100%;padding:10px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:10px;font-weight:bold;cursor:pointer;font-size:13px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_copy_new.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Скопировать реквизиты</button>'
            : '') +
          '<div id="orderTimer" style="text-align:center;margin-top:12px;font-size:22px;font-weight:800;color:#f5c96a;letter-spacing:2px;">--:--</div>' +
          '<div style="text-align:center;font-size:11px;color:#888;margin-bottom:10px;">Оплатите до истечения времени</div>' +
          '<div id="uploadReceiptWrap">' +
            '<label style="display:block;width:100%;padding:12px;background:#000;color:#4caf50;border:2px solid #4caf50;border-radius:10px;font-weight:bold;cursor:pointer;font-size:14px;text-align:center;box-sizing:border-box;">' +
              '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_upload_new.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Загрузить чек' +
              '<input type="file" accept="application/pdf" style="display:none;" onchange="_uploadReceipt(this,' + o.id + ')">' +
            '</label>' +
          '</div>' +
        '</div>';

      // Таймер от requisites_sent_at
      if (o.requisites_sent_at) {
        var sentAt = new Date(o.requisites_sent_at).getTime();
        var elapsed = Math.floor((Date.now() - sentAt) / 1000);
        var remaining = timerSec - elapsed;
        if (remaining <= 0) { _orderTimerExpired(o.id); }
        else { _startOrderTimer(o.id, remaining); }
      } else {
        _startOrderTimer(o.id, timerSec);
      }

    } else if (o.status === 'Проверка оплаты') {
      requisitesBlock =
        '<div style="background:rgba(33,150,243,0.08);border:1px solid rgba(33,150,243,0.3);border-radius:12px;padding:14px;margin-top:12px;font-size:14px;color:#2196F3;line-height:1.5;">' +
          '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_upload_new.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Чек получен. Ожидайте — выполняется проверка администратором.' +
        '</div>';
    }

    // Трек — если есть track_number
    var trackBlock = '';
    if (o.track_number) {
      var tkName = o.tk_name ? String(o.tk_name) : '';
      var trackNum = String(o.track_number);
      // Карта ТК → базовый URL для отслеживания
      var trackUrls = {
        'СДЭК':              'https://cdek.ru/tracking?order_id=',
        'Почта России':    'https://pochta.ru/tracking#',
        'Boxberry':          'https://boxberry.ru/tracking-page?id=',
        'DPD':               'https://dpd.ru/ols/trace/standard.do2?parcelNumber=',
        'Деловые линии':   'https://dellin.ru/tracker/orders/',
        'ПЭК':              'https://pecom.ru/services-are/tracking/',
        'СберЛогистика':    'https://sberlogistics.ru/',
        'Яндекс Доставка': 'https://dostavka.yandex.ru/',
        'Ozon':             'https://ozon.ru/tracking/',
        'Wildberries':      'https://wildberries.ru/services/tracking'
      };
      var trackUrl = tkName && trackUrls[tkName] ? trackUrls[tkName] + encodeURIComponent(trackNum) : null;
      var tkLabel = tkName ? escapeHTML(tkName) + ' · ' : '';
      trackBlock =
        '<div style="background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.3);border-radius:12px;padding:14px;margin-top:12px;">' +
          '<div style="font-size:13px;color:#4caf50;font-weight:700;margin-bottom:6px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/orders.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;">Информация об отправке</div>' +
          '<div style="font-size:15px;color:#fff;font-weight:bold;margin-bottom:10px;">' + tkLabel + escapeHTML(trackNum) + '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button onclick="_copyRequisite(this,\'' + trackNum.replace(/'/g, "\\\\''") + '\')" style="flex:1;padding:10px;background:#000;color:#d4af37;border:2px solid #d4af37;border-radius:10px;font-weight:bold;cursor:pointer;font-size:13px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_copy_new.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Скопировать</button>' +
            (trackUrl
              ? '<button onclick="window.open(\'' + trackUrl + '\',\'_blank\')" style="flex:1;padding:10px;background:#000;color:#4caf50;border:2px solid #4caf50;border-radius:10px;font-weight:bold;cursor:pointer;font-size:13px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/search.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Отследить</button>'
              : '') +
          '</div>' +
        '</div>';
    }

    // Кнопка «Связаться с администратором» — для всех кроме Доставлен и Получен
    var adminContactBlock = '';
    if (o.status !== 'Доставлен' && o.status !== 'Получен') {
      adminContactBlock =
        '<button onclick="window.open(\'https://t.me/Bezopasnaia_Sdelka\',\'_blank\')" ' +
          'style="margin-top:10px;width:100%;padding:12px;background:#000;color:#d4af37;' +
          'border:2px solid #d4af37;border-radius:12px;font-weight:bold;cursor:pointer;font-size:14px;">' +
          '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/support.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"> Связаться с администратором</button>';
    }

    // Кнопка «Подтвердить получение» (п.8)
    var confirmBlock = '';
    if (o.status === 'Доставлен') {
      confirmBlock =
        '<button onclick="_confirmDelivery(' + o.id + ')" ' +
          'style="margin-top:14px;width:100%;padding:14px;background:linear-gradient(135deg,#4caf50,#388e3c);' +
          'color:#fff;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:15px;">' +
          '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_paid.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Подтвердить получение</button>';
    }

    b.innerHTML =
      '<div class="page-back-btn" onclick="showMyOrders()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
      '<h2 class="section-title">Заказ #' + o.id + '</h2>' +
      '<div style="margin:0 10px 20px;background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:16px;padding:16px;">' +
        statusBlock +
        paidBanner +
        productBlock +
        repeatBlock +
        '<div>' + detailsRows + '</div>' +
        (o.status === 'Получен'
          ? '<div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.4);border-radius:12px;padding:18px;margin-top:14px;text-align:center;">' +
              '<div style="margin-bottom:10px;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_pickup.png?v=1" style="width:48px;height:48px;vertical-align:middle;"></div>' +
              '<div style="font-size:16px;font-weight:bold;color:#4caf50;margin-bottom:6px;">Благодарим вас за покупку!</div>' +
              '<div style="font-size:13px;color:#ccc;line-height:1.5;">Ваш заказ получен. Будем рады видеть вас снова!</div>' +
            '</div>'
          : requisitesBlock) +
        (o.status === 'Получен' ? '' : cancelBlock) +
        (o.status === 'Получен' ? '' : trackBlock) +
        confirmBlock +
        adminContactBlock +
      '</div>';

    renderBottomNav();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }).catch(function(e) {
    b.innerHTML =
      '<div class="page-back-btn" onclick="showMyOrders()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
      '<div style="text-align:center;padding:20px;color:#e53935;">Ошибка: ' + e.message + '</div>';
    renderBottomNav();
  });
}


function _cancelOrder(orderId) {
  if (!confirm('Отменить заказ?')) return;
  // archived=true — клиент сам отменил (его право, не считается блокировкой)
  fetch(ORDERS_URL + '?id=eq.' + orderId, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Отменён', archived: true })
  }).then(function() {
    // Считаем самостоятельно отменённые (archived=true) за последние 24ч
    if (currentTelegramId) {
      var since = new Date(Date.now() - 24*3600*1000).toISOString();
      var CLIENTS_URL_LOCAL = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/rest/v1/clients';
      fetch(ORDERS_URL + '?select=id&telegram_id=eq.' + currentTelegramId + '&status=eq.Отменён&archived=eq.true&created_at=gte.' + since, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      }).then(function(r){ return r.json(); }).then(function(selfCancelled) {
        if (Array.isArray(selfCancelled) && selfCancelled.length >= 3) {
          // Блокируем на 24ч
          var blockedUntil = new Date(Date.now() + 24*3600*1000).toISOString();
          fetch(CLIENTS_URL_LOCAL + '?telegram_id=eq.' + currentTelegramId, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocked_until: blockedUntil })
          }).catch(function(){}); 
        }
      }).catch(function(){});
    }
    sendNotify({
      action: 'order_cancelled',
      order_id: orderId,
      client_telegram_id: currentTelegramId
    });
    openOrderPage(orderId);
  }).catch(function(e) {
    alert('Ошибка: ' + e.message);
  });
}

function _confirmDelivery(orderId) {
  if (!confirm('Подтвердить получение заказа?')) return;
  // Сначала загружаем заказ чтобы знать product_id и quantity
  fetch(ORDERS_URL + '?select=product_id,price&id=eq.' + orderId, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r) { return r.json(); }).then(function(rows) {
    var o = (Array.isArray(rows) && rows.length > 0) ? rows[0] : {};
    var productId = o.product_id;
    var qty = (_orderState && _orderState.quantity && _orderState.pid === productId)
      ? parseInt(_orderState.quantity, 10) : 1;
    if (!qty || qty < 1) qty = 1;
    // PATCH статус заказа
    return fetch(ORDERS_URL + '?id=eq.' + orderId, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Получен' })
    }).then(function() {
      // PATCH stock товара: уменьшаем на qty (RPC через rpc/decrement не всегда доступен, читаем и пишем)
      if (productId) {
        fetch(SUPABASE_URL + '?select=stock&id=eq.' + productId, { headers: getHeaders() })
          .then(function(r) { return r.json(); })
          .then(function(prows) {
            var cur = (Array.isArray(prows) && prows.length > 0 && prows[0].stock != null)
              ? parseInt(prows[0].stock, 10) : null;
            if (cur !== null && !isNaN(cur)) {
              var newStock = Math.max(0, cur - qty);
              fetch(SUPABASE_URL + '?id=eq.' + productId, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify({ stock: newStock })
              }).catch(function() {});
            }
          }).catch(function() {});
      }
      openOrderPage(orderId);
    });
  }).catch(function(e) {
    alert('Ошибка: ' + e.message);
  });
}

// ── Вспомогательные функции страницы заказа ──

function _copyRequisite(btn, text) {
  var originalHTML = btn.innerHTML;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      btn.innerHTML = '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_ok.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Скопировано!';
      setTimeout(function() { btn.innerHTML = originalHTML; }, 2000);
    }).catch(function() { _copyFallback(btn, text, originalHTML); });
  } else {
    _copyFallback(btn, text, originalHTML);
  }
}

function _copyFallback(btn, text, originalHTML) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
  document.body.appendChild(ta);
  ta.select(); ta.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    btn.innerHTML = '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_ok.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Скопировано!';
    setTimeout(function() { btn.innerHTML = originalHTML; }, 2000);
  } catch(e) {}
  document.body.removeChild(ta);
}

var _orderTimerInterval = null;

function _startOrderTimer(orderId, seconds) {
  if (_orderTimerInterval) clearInterval(_orderTimerInterval);
  var end = Date.now() + seconds * 1000;
  function tick() {
    var el = document.getElementById('orderTimer');
    if (!el) { clearInterval(_orderTimerInterval); return; }
    var left = Math.max(0, Math.round((end - Date.now()) / 1000));
    var mm = String(Math.floor(left / 60)).padStart(2, '0');
    var ss = String(left % 60).padStart(2, '0');
    el.textContent = mm + ':' + ss;
    if (left === 0) {
      clearInterval(_orderTimerInterval);
      _orderTimerExpired(orderId);
    }
  }
  tick();
  _orderTimerInterval = setInterval(tick, 1000);
}

function _orderTimerExpired(orderId) {
  // 1. Загружаем payment_method из заказа
  fetch(ORDERS_URL + '?select=payment_method&id=eq.' + orderId, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  })
  .then(function(r) { return r.json(); })
  .then(function(rows) {
    var paymentMethod = (Array.isArray(rows) && rows.length > 0 && rows[0].payment_method)
      ? rows[0].payment_method : '';

    // 2. PATCH статуса на «Отменён» (archived=false — считается в блокировку)
    fetch(ORDERS_URL + '?id=eq.' + orderId, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'Отменён', archived: false })
    })
    .then(function() {

      // 3a. Отправляем уведомление с payment_method
      sendNotify({
        action: 'payment_expired',
        order_id: orderId,
        payment_method: paymentMethod,
        client_telegram_id: currentTelegramId
      });

      // 3b. Считаем неоплаченные (archived=false) — если 3+ → постоянная блокировка
      if (currentTelegramId) {
        var CLIENTS_URL_LOCAL = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/rest/v1/clients';
        fetch(ORDERS_URL + '?select=id&telegram_id=eq.' + currentTelegramId + '&status=eq.Отменён&archived=eq.false&limit=100', {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        })
        .then(function(r) { return r.json(); })
        .then(function(unpaid) {
          if (Array.isArray(unpaid) && unpaid.length >= 3) {
            fetch(CLIENTS_URL_LOCAL + '?telegram_id=eq.' + currentTelegramId, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ blocked_until: '2099-12-31T23:59:59Z' })
            }).catch(function() {});
          }
        })
        .catch(function() {});
      }

      // 3c. Заменяем содержимое #uploadReceiptWrap на кнопку повтора
      var wrap = document.getElementById('uploadReceiptWrap');
      if (wrap) {
        wrap.innerHTML =
          '<button onclick="_repeatOrder(' + orderId + ')" ' +
            'style="width:100%;padding:14px;background:linear-gradient(135deg,#d4af37,#b8960c);' +
            'color:#000;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:15px;">' +
            '🔄 Повторить заказ' +
          '</button>';
      }

    })
    .catch(function() {});   // конец .then(PATCH)

  })
  .catch(function() {});     // конец .then(rows) / catch внешнего fetch
}

function _openExpiredOrderPage(orderId) {
  // Загружаем данные отменённого заказа чтобы показать кнопку «Повторить»
  fetch(ORDERS_URL + '?id=eq.' + orderId, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r){ return r.json(); }).then(function(data) {
    var o = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!o) { openOrderPage(orderId); return; }

    var b = document.getElementById('categories'); if (!b) return;
    currentView = 'order_detail'; hideBanner();
    var s = document.getElementById('search'); if (s) s.style.display = 'none';
    var sw = document.getElementById('searchWrap'); if (sw) sw.style.display = 'none';

    var sc = getOrderStatusColor(o.status), se = getOrderStatusEmoji(o.status);

    b.innerHTML =
      '<div class="page-back-btn" onclick="showMyOrders()"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/back.png?v=1" class="page-back-icon"></div>' +
      '<h2 class="section-title">Заказ #' + o.id + '</h2>' +
      '<div style="margin:0 10px 20px;background:rgba(0,0,0,0.6);border:2px solid #d4af37;border-radius:16px;padding:16px;">' +
        '<div style="text-align:center;margin-bottom:14px;">' +
          '<span style="display:inline-block;padding:8px 20px;border-radius:12px;font-size:15px;font-weight:bold;border:2px solid ' + sc + ';color:' + sc + ';background:#000;">' + se + ' ' + escapeHTML(o.status || '') + '</span>' +
        '</div>' +
        '<div style="background:rgba(229,57,53,0.08);border:1px solid rgba(229,57,53,0.3);border-radius:12px;padding:14px;margin-bottom:14px;font-size:14px;color:#e53935;line-height:1.5;text-align:center;">' +
          '⏰ Время оплаты истекло. Заказ отменён автоматически.' +
        '</div>' +
        '<div style="background:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.25);border-radius:12px;padding:14px;margin-bottom:14px;">' +
          '<div style="font-size:12px;color:#888;margin-bottom:4px;">Товар</div>' +
          '<div style="font-size:16px;font-weight:bold;color:#fff;line-height:1.35;margin-bottom:6px;">' + escapeHTML(o.product_title || '—') + '</div>' +
          '<div style="font-size:22px;font-weight:800;color:#f5c96a;"><img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/price.png?v=1" style="width:20px;height:20px;vertical-align:middle;margin-right:2px;"> ' + escapeHTML(o.price || '—') + '</div>' +
        '</div>' +
        '<button onclick="_repeatOrder(' + o.id + ')" ' +
          'style="width:100%;padding:14px;background:linear-gradient(135deg,#d4af37,#b8960c);' +
          'color:#000;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:15px;">' +
          '🔄 Повторить заказ</button>' +
      '</div>';

    renderBottomNav();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }).catch(function() { openOrderPage(orderId); });
}

function _repeatOrder(orderId) {
  // Загружаем данные исходного заказа и открываем форму с предзаполненными данными
  fetch(ORDERS_URL + '?id=eq.' + orderId, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  }).then(function(r){ return r.json(); }).then(function(data) {
    var o = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!o || !o.product_id) { alert('Не удалось загрузить данные заказа'); return; }
    var p = allProducts.find(function(x){ return x.id === o.product_id; });
    if (!p) {
      alert('Товар не найден в каталоге');
      return;
    }
    // Предзаполняем _orderState из данных старого заказа
    _orderState = {
      pid:             p.id,
      step:            9,  // сразу на шаг подтверждения
      delivery_method: o.delivery_type === 'Самовывоз' ? 'Самовывоз' : 'Доставка',
      carrier:         o.delivery_type || '',
      name:            o.client_name || '',
      city:            '',
      street:          '',
      house:           '',
      phone:           o.client_phone || '',
      payment:         o.payment_method ? o.payment_method.split('/')[0].trim() : '',
      bank:            '',
      quantity:        1
    };
    // Если есть client_address — пробуем разобрать на части (город, улица, дом)
    if (o.client_address && o.client_address !== 'Самовывоз') {
      var parts = o.client_address.split(',').map(function(s){ return s.trim(); });
      _orderState.city   = parts[0] || '';
      _orderState.street = parts[1] || '';
      _orderState.house  = parts[2] || '';
    }
    _renderOrderStep(p);
  }).catch(function() {
    alert('Ошибка при загрузке данных заказа');
  });
}

async function _uploadReceipt(input, orderId) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    alert('Нужно загрузить чек в формате PDF');
    return;
  }
  var wrap = document.getElementById('uploadReceiptWrap');
  if (wrap) wrap.innerHTML = '<div style="text-align:center;padding:10px;color:#d4af37;">⏳ Загрузка чека...</div>';
  if (_orderTimerInterval) clearInterval(_orderTimerInterval);

  try {
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    var fn = 'receipt_' + orderId + '_' + Date.now() + '.' + ext;
    var RECEIPTS_UPLOAD = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/receipts';
    var RECEIPTS_PUBLIC = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/receipts';
    var fd = new FormData();
    fd.append('file', file);
    var ur = await fetch(RECEIPTS_UPLOAD + '/' + fn, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'x-upsert': 'true' },
      body: fd
    });
    if (!ur.ok) throw new Error('Ошибка загрузки ' + ur.status);
    var receiptUrl = RECEIPTS_PUBLIC + '/' + fn;
    await fetch(ORDERS_URL + '?id=eq.' + orderId, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_url: receiptUrl, status: 'Проверка оплаты' })
    });
    sendNotify({
      action: 'receipt_uploaded',
      order_id: orderId,
      client_name: '',
      client_telegram_id: currentTelegramId
    });
    // Перезагружаем страницу заказа
    openOrderPage(orderId);
  } catch(e) {
    if (wrap) wrap.innerHTML =
      '<div style="text-align:center;padding:8px;color:#e53935;">❌ Ошибка: ' + e.message + '</div>' +
      '<label style="display:block;width:100%;padding:12px;margin-top:8px;background:#000;color:#4caf50;border:2px solid #4caf50;border-radius:10px;font-weight:bold;cursor:pointer;font-size:14px;text-align:center;box-sizing:border-box;">' +
        '<img src="https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/ico_upload_new.png?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;"> Попробовать снова' +
        '<input type="file" accept="application/pdf" style="display:none;" onchange="_uploadReceipt(this,' + orderId + ')">' +
      '</label>';
  }
}

function getOrderStatusEmoji(s) {
  var base = 'https://wwhpxpxflkbrlhbarqmx.supabase.co/storage/v1/object/public/icons/';
  var icons = {
    'Ожидает реквизитов': 'ico_pending.png',
    'Ожидает оплаты': 'ico_waiting.png',
    'Проверка оплаты': 'ico_waiting.png',
    'Оплачен': 'ico_paid.png',
    'Отправлен': 'ico_shipped.png',
    'Доставлен': 'ico_delivered.png',
    'Получен': 'ico_delivered.png',
    'Отменён': 'ico_cancelled.png'
  };
  var icon = icons[s];
  return icon ? '<img src="' + base + icon + '?v=1" style="width:16px;height:16px;vertical-align:middle;margin-right:3px;">' : '📌';
}

function getOrderStatusColor(s) {
  var c = {
    'Ожидает реквизитов': '#d4af37',
    'Ожидает оплаты':     '#d4af37',
    'Проверка оплаты':    '#d4af37',
    'Оплачен':            '#4caf50',
    'Отправлен':          '#4caf50',
    'Доставлен':          '#4caf50',
    'Отменён':            '#e53935'
  };
  return c[s] || '#d4af37';
}