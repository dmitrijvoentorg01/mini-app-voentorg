// === app-api.js — Работа с Supabase API ===

function getHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  };
}

async function loadMaintenanceMode() {
  try {
    var r = await fetch(SETTINGS_URL + "?select=maintenance_mode&id=eq.1", { headers: getHeaders() });
    var d = await r.json();
    if (Array.isArray(d) && d.length > 0) maintenanceMode = d[0].maintenance_mode === true;
  } catch(e) { maintenanceMode = false; }
}
