const STORAGE_KEY = 'sala-dashboard-reservations-v1';
const RESET_PASSWORD = 'intec2026';
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 21;
const NON_BLOCKING_ROLES = new Set(['Asistente de sala', 'Pasante']);
let memoryStoreRaw = null;
let calendarFocusDate = new Date();

const defaultReservations = [
  {
    id: crypto.randomUUID(),
    title: 'Edición de video',
    owner: 'Laura Álvarez',
    role: 'Profesor',
    ownerId: '1001',
    participants: 'Carlos Ruiz - 1002',
    work: 'Montaje y audio',
    project: 'Campaña verano 2026',
    schedule: '09:00 - 13:00',
    room: 'Sala A',
    date: '2026-07-15',
    startTime: '09:00',
    endTime: '10:00',
    status: 'Confirmada'
  },
  {
    id: crypto.randomUUID(),
    title: 'Revisión de reels',
    owner: 'Miguel Torres',
    role: 'Estudiante',
    ownerId: '1003',
    participants: 'Ana Pérez - 1004',
    work: 'Color grading',
    project: 'Contenido social',
    schedule: '14:00 - 18:00',
    room: 'Sala B',
    date: '2026-07-14',
    startTime: '14:00',
    endTime: '15:30',
    status: 'Finalizada'
  },
  {
    id: crypto.randomUUID(),
    title: 'Capacitación interna',
    owner: 'Paula Díaz',
    role: 'Pasante',
    ownerId: '1005',
    participants: 'Sofía Vega - 1006',
    work: 'Entrenamiento de herramientas',
    project: 'Mejora de procesos',
    schedule: '10:00 - 12:30',
    room: 'Sala A',
    date: '2026-07-16',
    startTime: '11:00',
    endTime: '12:30',
    status: 'Pendiente'
  },
  {
    id: crypto.randomUUID(),
    title: 'Sesión de diseño',
    owner: 'Diego Ramos',
    role: 'Asistente de sala',
    ownerId: '1007',
    participants: 'Nora Luján - 1008',
    work: 'Storyboard',
    project: 'Identidad visual',
    schedule: '16:00 - 17:00',
    room: 'Sala C',
    date: '2026-07-12',
    startTime: '16:00',
    endTime: '17:00',
    status: 'Cancelada'
  }
];

let reservations = loadReservations();
const filterState = { search: '', room: '', status: '' };

function getDefaultReservations() {
  return defaultReservations.map((item) => ({ ...item }));
}

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
}

function parseLocalDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`);
}

function setCalendarFocusDate(dateStr) {
  const parsed = parseLocalDate(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    calendarFocusDate = parsed;
  }
}

function shiftCalendarWeeks(weeks) {
  const next = new Date(calendarFocusDate);
  next.setDate(next.getDate() + (weeks * 7));
  calendarFocusDate = next;
  renderCalendar();
}

function focusCurrentWeek() {
  calendarFocusDate = new Date();
  renderCalendar();
}

function isSunday(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.getDay() === 0;
}

function isNonBlockingRole(role) {
  return NON_BLOCKING_ROLES.has(role);
}

function isActiveReservation(item) {
  const normalized = normalizeStatus(item);
  return normalized !== 'Cancelada' && normalized !== 'Finalizada';
}

function overlaps(startA, endA, startB, endB) {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

function loadReservations() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = memoryStoreRaw;
  }
  if (!raw) return getDefaultReservations();
  try {
    return JSON.parse(raw);
  } catch {
    return getDefaultReservations();
  }
}

function saveReservations() {
  const serialized = JSON.stringify(reservations);
  memoryStoreRaw = serialized;
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // SharePoint sandbox puede bloquear localStorage (SecurityError).
  }
}

async function clearBrowserCacheStorage() {
  if (!('caches' in window)) return;
  try {
    const cacheKeys = await window.caches.keys();
    await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
  } catch {
    // Algunos entornos restringen Cache Storage.
  }
}

function askResetPassword() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,0.65)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:9999',
      'padding:16px'
    ].join(';');

    const panel = document.createElement('div');
    panel.style.cssText = [
      'width:min(420px,100%)',
      'background:#0f1b2d',
      'border:1px solid rgba(255,255,255,0.12)',
      'border-radius:14px',
      'padding:16px',
      'color:#f3f7ff',
      'box-shadow:0 16px 40px rgba(0,0,0,0.45)'
    ].join(';');

    const title = document.createElement('h3');
    title.textContent = 'Restablecer datos';
    title.style.cssText = 'margin:0 0 8px;font-size:1.05rem;';

    const text = document.createElement('p');
    text.textContent = 'Ingresa la clave para confirmar el restablecimiento.';
    text.style.cssText = 'margin:0 0 12px;color:#b8c7df;font-size:0.92rem;';

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'Clave';
    input.style.cssText = [
      'width:100%',
      'padding:10px 12px',
      'border-radius:10px',
      'border:1px solid rgba(255,255,255,0.18)',
      'background:#13233a',
      'color:#f3f7ff',
      'margin-bottom:12px'
    ].join(';');

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = [
      'padding:8px 12px',
      'border-radius:10px',
      'border:1px solid rgba(255,255,255,0.2)',
      'background:transparent',
      'color:#f3f7ff',
      'cursor:pointer'
    ].join(';');

    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.textContent = 'Confirmar';
    acceptBtn.style.cssText = [
      'padding:8px 12px',
      'border-radius:10px',
      'border:0',
      'background:#4f8cff',
      'color:#fff',
      'cursor:pointer'
    ].join(';');

    const finish = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelBtn.addEventListener('click', () => finish(null));
    acceptBtn.addEventListener('click', () => finish(input.value));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(null);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(input.value);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(null);
      }
    });

    actions.append(cancelBtn, acceptBtn);
    panel.append(title, text, input, actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    input.focus();
  });
}

function getNoticeBox() {
  let box = document.getElementById('appNotice');
  if (box) return box;

  box = document.createElement('div');
  box.id = 'appNotice';
  box.style.cssText = [
    'display:none',
    'margin:0 0 14px',
    'padding:10px 12px',
    'border-radius:10px',
    'font-size:0.92rem',
    'font-weight:600',
    'border:1px solid transparent'
  ].join(';');

  const shell = document.querySelector('.app-shell');
  const firstPanel = document.querySelector('.grid');
  if (shell && firstPanel) {
    shell.insertBefore(box, firstPanel);
  }
  return box;
}

function showNotice(message, type = 'info') {
  const box = getNoticeBox();
  if (!box) return;

  const palette = {
    info: {
      bg: 'rgba(79,140,255,0.18)',
      border: 'rgba(79,140,255,0.55)',
      text: '#d7e7ff'
    },
    success: {
      bg: 'rgba(34,197,94,0.2)',
      border: 'rgba(34,197,94,0.58)',
      text: '#cbf7dc'
    },
    error: {
      bg: 'rgba(239,68,68,0.22)',
      border: 'rgba(239,68,68,0.58)',
      text: '#ffd5d5'
    }
  };

  const current = palette[type] || palette.info;
  box.textContent = message;
  box.style.display = 'block';
  box.style.background = current.bg;
  box.style.borderColor = current.border;
  box.style.color = current.text;

  window.clearTimeout(showNotice.timeoutId);
  showNotice.timeoutId = window.setTimeout(() => {
    box.style.display = 'none';
  }, 4000);
}

function formatDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRange(item) {
  return `${formatDate(item.date)} · ${item.startTime} a ${item.endTime}`;
}

function formatDetails(item) {
  const parts = [];
  if (item.owner) parts.push(`Responsable: ${item.owner} (${item.ownerId || 'sin ID'})`);
  if (item.role) parts.push(`Rol: ${item.role}`);
  if (item.work) parts.push(`Trabajo: ${item.work}`);
  if (item.project) parts.push(`Proyecto: ${item.project}`);
  if (item.schedule) parts.push(`Horario: ${item.schedule}`);
  if (item.participants) parts.push(`Participantes: ${item.participants}`);
  return parts.join(' · ');
}

function normalizeStatus(item) {
  const now = new Date();
  const eventDate = new Date(`${item.date}T${item.endTime}`);
  if (item.status === 'Cancelada') return 'Cancelada';
  if (eventDate < now) return 'Finalizada';
  return item.status;
}

function getFilteredReservations({ statuses } = {}) {
  const normalized = reservations.map((item) => ({ ...item, status: normalizeStatus(item) }));
  const searchText = filterState.search.trim().toLowerCase();

  return normalized.filter((item) => {
    const hayTexto = !searchText || [item.title, item.owner, item.role, item.project, item.work, item.participants, item.room].join(' ').toLowerCase().includes(searchText);
    const haySala = !filterState.room || item.room === filterState.room;
    const hayEstado = !filterState.status || item.status === filterState.status;
    const hayStatus = !statuses || statuses.includes(item.status);
    return hayTexto && haySala && hayEstado && hayStatus;
  });
}

function getMetrics() {
  const normalized = reservations.map((item) => ({ ...item, status: normalizeStatus(item) }));
  const today = new Date().toISOString().slice(0, 10);
  const total = normalized.length;
  const todayCount = normalized.filter((item) => item.date === today && isActiveReservation(item) && !isNonBlockingRole(item.role)).length;
  const confirmed = normalized.filter((item) => item.status === 'Confirmada' || item.status === 'Finalizada').length;
  const pending = normalized.filter((item) => item.status === 'Pendiente').length;
  return { total, todayCount, confirmed, pending };
}

function renderMetrics() {
  const metrics = getMetrics();
  const container = document.getElementById('metrics');
  container.innerHTML = [
    { label: 'Total reservas', value: metrics.total },
    { label: 'Ocupadas hoy', value: metrics.todayCount },
    { label: 'Confirmadas', value: metrics.confirmed },
    { label: 'Pendientes', value: metrics.pending }
  ].map((metric) => `
    <article class="metric">
      <div class="value">${metric.value}</div>
      <div class="label">${metric.label}</div>
    </article>
  `).join('');
}

function renderUpcoming() {
  const list = document.getElementById('upcomingList');
  const normalized = getFilteredReservations({ statuses: ['Confirmada', 'Pendiente'] }).sort((a, b) => a.date.localeCompare(b.date));

  if (!normalized.length) {
    list.innerHTML = '<div class="item"><p>No hay reservas próximas con esos filtros.</p></div>';
    return;
  }

  list.innerHTML = normalized.map((item) => `
    <article class="item">
      <h3>${item.title}</h3>
      <div class="meta">${item.room} · ${item.owner}</div>
      <div class="meta">${formatRange(item)}</div>
      <div class="meta">${formatDetails(item)}</div>
      <span class="badge ${item.status.toLowerCase()}">${item.status}</span>
    </article>
  `).join('');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const normalized = getFilteredReservations({ statuses: ['Finalizada', 'Cancelada'] }).sort((a, b) => b.date.localeCompare(a.date));

  if (!normalized.length) {
    list.innerHTML = '<div class="item"><p>No hay historial con esos filtros.</p></div>';
    return;
  }

  list.innerHTML = normalized.map((item) => `
    <article class="item">
      <h3>${item.title}</h3>
      <div class="meta">${item.room} · ${item.owner}</div>
      <div class="meta">${formatRange(item)}</div>
      <div class="meta">${formatDetails(item)}</div>
      <span class="badge ${item.status.toLowerCase()}">${item.status}</span>
    </article>
  `).join('');
}

function renderFilters() {
  const roomSelect = document.getElementById('filterRoom');
  const rooms = [...new Set(reservations.map((item) => item.room).filter(Boolean))].sort();
  const currentValue = roomSelect.value;
  roomSelect.innerHTML = '<option value="">Todas las salas</option>' + rooms.map((room) => `<option value="${room}">${room}</option>`).join('');
  roomSelect.value = currentValue || filterState.room;
}

function render() {
  renderMetrics();
  renderFilters();
  renderUpcoming();
  renderHistory();
  renderCalendar();
}

function renderCalendar() {
  const calendar = document.getElementById('calendar');
  const baseDate = new Date(calendarFocusDate);
  const startOfWeek = new Date(baseDate);
  const mondayDelta = (baseDate.getDay() + 6) % 7;
  startOfWeek.setDate(baseDate.getDate() - mondayDelta);

  const days = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return date;
  });

  const dayHeaders = days.map((date) => {
    const label = date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' });
    return `<div class="week-head">${label}</div>`;
  }).join('');

  const weekRangeLabel = document.getElementById('weekRangeLabel');
  if (weekRangeLabel) {
    const rangeStart = days[0].toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    const rangeEnd = days[days.length - 1].toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    weekRangeLabel.textContent = `Semana visible: ${rangeStart} al ${rangeEnd}`;
  }

  const filtered = getFilteredReservations();
  const rows = [];

  for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour += 1) {
    const hourLabel = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 1).padStart(2, '0')}:00`;
    rows.push(`<div class="hour-label">${hourLabel}</div>`);

    for (const day of days) {
      const dateKey = day.toISOString().slice(0, 10);
      const slotStart = hour * 60;
      const slotEnd = (hour + 1) * 60;

      const slotItems = filtered.filter((item) => {
        if (item.date !== dateKey || !isActiveReservation(item)) return false;
        return overlaps(slotStart, slotEnd, toMinutes(item.startTime), toMinutes(item.endTime));
      });

      const occupiedItems = slotItems.filter((item) => !isNonBlockingRole(item.role));
      const supportItems = slotItems.filter((item) => isNonBlockingRole(item.role));

      let state = 'free';
      let label = 'Disponible';
      let note = '';

      if (occupiedItems.length) {
        state = 'occupied';
        label = 'Ocupada';
        const first = occupiedItems[0];
        note = `${first.startTime}-${first.endTime} · ${first.owner}`;
      } else if (supportItems.length) {
        state = 'support';
        label = 'Soporte';
        const first = supportItems[0];
        note = `${first.startTime}-${first.endTime} · ${first.role}`;
      }

      rows.push(`
        <div class="slot ${state}" title="${label}${note ? ` - ${note}` : ''}">
          <span class="slot-label">${label}</span>
          ${note ? `<span class="slot-note">${note}</span>` : ''}
        </div>
      `);
    }
  }

  calendar.innerHTML = [`<div class="week-head"></div>`, dayHeaders, ...rows].join('');
}

async function askAssistant() {
  const prompt = document.getElementById('assistantPrompt').value.trim();
  const replyBox = document.getElementById('assistantReply');
  if (!prompt) {
    replyBox.innerHTML = '<p>Escribe una pregunta o tarea para el modelo.</p>';
    return;
  }

  const isLocalHost = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
  if (!isLocalHost) {
    replyBox.innerHTML = '<p>Asistente local no disponible desde SharePoint. Esta función solo opera en tu computador (localhost).</p>';
    return;
  }

  replyBox.innerHTML = '<p>Consultando el modelo local...</p>';
  try {
    const response = await fetch('http://127.0.0.1:5001/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'auto' })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Error desconocido en el asistente.');
    }
    const providerLabel = data.provider ? ` (${data.provider.toUpperCase()})` : '';
    replyBox.innerHTML = `<p><strong>Respuesta${providerLabel}:</strong> ${data.reply || 'Sin respuesta.'}</p>`;
  } catch (error) {
    replyBox.innerHTML = `<p>Error al contactar al modelo local: ${error.message}</p>`;
  }
}

async function resetData() {
  const password = await askResetPassword();
  if (password === null) return;
  if (password.trim() !== RESET_PASSWORD) {
    showNotice('Clave incorrecta. No se restablecieron los datos.', 'error');
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Si el navegador bloquea localStorage, continuamos con memoria temporal.
  }

  memoryStoreRaw = null;
  reservations = [];
  calendarFocusDate = new Date();
  filterState.search = '';
  filterState.room = '';
  filterState.status = '';
  await clearBrowserCacheStorage();

  const searchInput = document.getElementById('filterSearch');
  const roomSelect = document.getElementById('filterRoom');
  const statusSelect = document.getElementById('filterStatus');
  if (searchInput) searchInput.value = '';
  if (roomSelect) roomSelect.value = '';
  if (statusSelect) statusSelect.value = '';

  saveReservations();
  render();
  showNotice('Datos restablecidos: no hay reservas activas.', 'success');
}

function hasConflict(newItem) {
  if (isNonBlockingRole(newItem.role)) return false;

  const newStart = toMinutes(newItem.startTime);
  const newEnd = toMinutes(newItem.endTime);

  return reservations.some((item) => {
    if (!isActiveReservation(item)) return false;
    if (isNonBlockingRole(item.role)) return false;
    if (item.room !== newItem.room || item.date !== newItem.date) return false;

    const currentStart = toMinutes(item.startTime);
    const currentEnd = toMinutes(item.endTime);
    return overlaps(newStart, newEnd, currentStart, currentEnd);
  });
}

function bindFilters() {
  const searchInput = document.getElementById('filterSearch');
  const roomSelect = document.getElementById('filterRoom');
  const statusSelect = document.getElementById('filterStatus');
  const clearBtn = document.getElementById('clearFiltersBtn');

  searchInput.addEventListener('input', (event) => {
    filterState.search = event.target.value;
    render();
  });

  roomSelect.addEventListener('change', (event) => {
    filterState.room = event.target.value;
    render();
  });

  statusSelect.addEventListener('change', (event) => {
    filterState.status = event.target.value;
    render();
  });

  clearBtn.addEventListener('click', () => {
    filterState.search = '';
    filterState.room = '';
    filterState.status = '';
    searchInput.value = '';
    roomSelect.value = '';
    statusSelect.value = '';
    render();
  });
}

function bindCalendarNavigation() {
  const prevBtn = document.getElementById('prevWeekBtn');
  const nextBtn = document.getElementById('nextWeekBtn');
  const todayBtn = document.getElementById('todayWeekBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => shiftCalendarWeeks(-1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => shiftCalendarWeeks(1));
  }
  if (todayBtn) {
    todayBtn.addEventListener('click', focusCurrentWeek);
  }
}

function initFormDefaults() {
  const dateInput = document.querySelector('input[name="date"]');
  if (dateInput && !dateInput.value) {
    const baseDate = new Date();
    if (baseDate.getDay() === 0) {
      baseDate.setDate(baseDate.getDate() + 1);
    }
    dateInput.value = baseDate.toISOString().slice(0, 10);
  }
}

document.getElementById('reservationForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const newReservation = {
    id: crypto.randomUUID(),
    title: formData.get('title').toString().trim(),
    owner: formData.get('owner').toString().trim(),
    role: formData.get('role').toString().trim(),
    ownerId: formData.get('ownerId').toString().trim(),
    participants: formData.get('participants').toString().trim(),
    work: formData.get('work').toString().trim(),
    project: formData.get('project').toString().trim(),
    schedule: formData.get('schedule').toString().trim(),
    room: formData.get('room').toString().trim(),
    date: formData.get('date').toString(),
    startTime: formData.get('startTime').toString(),
    endTime: formData.get('endTime').toString(),
    status: formData.get('status').toString()
  };

  const start = toMinutes(newReservation.startTime);
  const end = toMinutes(newReservation.endTime);
  const dayStart = WORK_START_HOUR * 60;
  const dayEnd = WORK_END_HOUR * 60;

  if (start >= end) {
    showNotice('La hora de fin debe ser mayor que la hora de inicio.', 'error');
    return;
  }

  if (start < dayStart || end > dayEnd) {
    showNotice('El horario permitido es de 8:00 AM a 9:00 PM.', 'error');
    return;
  }

  if (isSunday(newReservation.date)) {
    showNotice('Los domingos no están disponibles para reservas.', 'error');
    return;
  }

  if (hasConflict(newReservation)) {
    showNotice('Ese horario ya está reservado en esa sala. Elige otro bloque de tiempo.', 'error');
    return;
  }

  reservations.push(newReservation);
  setCalendarFocusDate(newReservation.date);
  saveReservations();
  event.currentTarget.reset();
  initFormDefaults();
  render();
  showNotice('Reserva guardada correctamente.', 'success');
});

document.getElementById('resetBtn').addEventListener('click', resetData);
document.getElementById('assistantBtn').addEventListener('click', askAssistant);

bindFilters();
bindCalendarNavigation();
initFormDefaults();
render();
saveReservations();
