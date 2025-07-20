// --- CONFIGURACIÓN ---
const APP_VERSION = '6.8';
window.appVersion = APP_VERSION;

const MATARO_HOLIDAYS_URL =
  "https://corsproxy.io/?https://www.mataro.cat/es/la-ciudad/festivos-locales";
const LOCAL_STORAGE_KEY = "customHolidays";
const MATARO_CACHE_KEY = "mataroHolidaysCache";
const MATARO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas en ms

// --- VARIABLES GLOBALES PARA ELEMENTOS DEL DOM ---
let yearSelect, monthSelect, assignedHoursInput, calculateBtn, resultsContainer, loadingEl;
let errorContainer, includeOffdaysToggle, totalMonthHours, hoursSoFar;
let totalMonthHoursTitle, monthNameTitle, yearTitle, workdaysEl, offDaysEl;
let balanceValueEl, balanceTextEl, resetBtn, clearCacheBtn;
let holidayListEl, addHolidayForm, customHolidayDate, customHolidayName;
let holidayListContainer, toggleHolidayListBtn, festivoHoursGroup, festivoHoursInput;
// Nuevos elementos para compartir
let shareWhatsAppBtn, shareEmailBtn, addToCalendarBtn;
// Elementos para el tema
let themeToggle, themeIcon;

// --- NUEVO: DÍAS DE LA SEMANA ---
const weekdayIds = [
  { key: 'mon', label: 'Lunes', jsDay: 1 },
  { key: 'tue', label: 'Martes', jsDay: 2 },
  { key: 'wed', label: 'Miércoles', jsDay: 3 },
  { key: 'thu', label: 'Jueves', jsDay: 4 },
  { key: 'fri', label: 'Viernes', jsDay: 5 },
  { key: 'sat', label: 'Sábado', jsDay: 6 },
  { key: 'sun', label: 'Domingo', jsDay: 0 },
];
const weekdaySwitches = {};
const weekdayHoursInputs = {};
const slimSelectInstances = {};

// --- ESTADO DE LA APLICACIÓN ---
let holidaysMataro = [];
let customHolidays = [];
let holidays = [];
let calculationTimeout = null;

// --- FUNCIONES DE INICIALIZACIÓN ---
function initializeDOMElements() {
  // Elementos principales
  yearSelect = document.getElementById('year');
  monthSelect = document.getElementById('month');
  assignedHoursInput = document.getElementById('totalHours');
  calculateBtn = document.getElementById('calculateBtn');
  resultsContainer = document.getElementById('results-container');
  loadingEl = document.getElementById('loading');
  errorContainer = document.getElementById('error-container');
  
  // Elementos de resultados
  totalMonthHours = document.getElementById('totalMonthHours');
  hoursSoFar = document.getElementById('hoursSoFar');
  totalMonthHoursTitle = document.getElementById('totalMonthHoursTitle');
  monthNameTitle = document.getElementById('monthNameTitle');
  yearTitle = document.getElementById('yearTitle');
  workdaysEl = document.getElementById('workdays');
  offDaysEl = document.getElementById('offDays');
  balanceValueEl = document.getElementById('balanceValue');
  
  // Elementos de festivos
  includeOffdaysToggle = document.getElementById('includeOffdays');
  festivoHoursGroup = document.getElementById('festivo-hours-group');
  festivoHoursInput = document.getElementById('hours-festivo');
  holidayListEl = document.getElementById('holidayList');
  addHolidayForm = document.getElementById('addHolidayForm');
  customHolidayDate = document.getElementById('customHolidayDate');
  customHolidayName = document.getElementById('customHolidayName');
  holidayListContainer = document.getElementById('holidayListContainer');
  toggleHolidayListBtn = document.getElementById('toggleHolidayListBtn');
  
  // Botones
  resetBtn = document.getElementById('resetBtn');
  clearCacheBtn = document.getElementById('clearCacheBtn');
  shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
  shareEmailBtn = document.getElementById('shareEmailBtn');
  addToCalendarBtn = document.getElementById('addToCalendarBtn');
  
  // Elementos para el tema
  themeToggle = document.getElementById('themeToggle');
  themeIcon = document.getElementById('themeIcon');
  
  // Inicializar días de la semana
  weekdayIds.forEach(weekday => {
    const switchId = `weekday-${weekday.key}`;
    const hoursId = `hours-${weekday.key}`;
    
    weekdaySwitches[weekday.key] = document.getElementById(switchId);
    weekdayHoursInputs[weekday.key] = document.getElementById(hoursId);
  });
  
  console.log('Elementos DOM inicializados:', {
    yearSelect: !!yearSelect,
    monthSelect: !!monthSelect,
    assignedHoursInput: !!assignedHoursInput,
    resultsContainer: !!resultsContainer
  });
}

function showError(message) {
  console.error('Error:', message);
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="error-message">❌ ${message}</div>`;
    errorContainer.style.display = 'block';
  }
}

function initializeSlimSelects() {
  // Inicializar SlimSelect para todos los selects
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    if (select.id) {
      try {
        const instance = new SlimSelect(`#${select.id}`);
        slimSelectInstances[select.id] = instance;
      } catch (error) {
        console.warn(`No se pudo inicializar SlimSelect para ${select.id}:`, error);
      }
    }
  });
  
  console.log('SlimSelect inicializado para', Object.keys(slimSelectInstances).length, 'elementos');
}

// --- UTILIDADES DE RENDIMIENTO ---
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Funciones de conversión de horas
function decimalToHoursMinutes(decimalHours) {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return { hours, minutes };
}

function hoursMinutesToDecimal(hours, minutes) {
  return hours + (minutes / 60);
}

function formatHoursDisplay(decimalHours) {
  const { hours, minutes } = decimalToHoursMinutes(decimalHours);
  if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}min`;
  }
}

function createLocalDate(year, month, day) {
  // Crear fecha en zona horaria local para evitar problemas de UTC
  // Usar el constructor que maneja mejor las zonas horarias
  return new Date(year, month, day, 0, 0, 0, 0);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function displayError(message) {
  if (errorContainer) {
    errorContainer.innerHTML = `<div class="error">${message}</div>`;
  }
}

function isHoliday(date, holidayList) {
  // Usar fecha local para evitar problemas de zona horaria
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  console.log(`Verificando festivo para ${dateStr}:`, holidayList.includes(dateStr));
  return holidayList.includes(dateStr);
}

function fillHourSelect(select, max, step) {
  if (!select) return;
  
  select.innerHTML = '<option value="">--</option>';
  
  // Generar opciones con incrementos de 15 minutos (0.25 horas)
  for (let i = 0; i <= max; i += step) {
    const option = document.createElement('option');
    option.value = i;
    
    // Formatear la etiqueta para mostrar horas y minutos
    let label;
    if (i === 0) {
      label = '0 horas';
    } else {
      const { hours, minutes } = decimalToHoursMinutes(i);
      if (hours > 0 && minutes > 0) {
        label = `${hours}h ${minutes}min`;
      } else if (hours > 0) {
        label = `${hours} horas`;
      } else {
        label = `${minutes} minutos`;
      }
    }
    
    option.textContent = label;
    select.appendChild(option);
  }
}

// --- CÁLCULO DE BALANCE MEJORADO ---
const debouncedCalculateBalance = debounce(calculateBalance, 300);

function calculateBalance() {
  if (!yearSelect || !monthSelect || !assignedHoursInput) {
    console.error('Elementos básicos no encontrados:', { yearSelect, monthSelect, assignedHoursInput });
    return;
  }
  
  const year = parseInt(yearSelect.value);
  const month = parseInt(monthSelect.value);
  const assignedHours = parseFloat(assignedHoursInput.value) || 0;
  const offdayHours = parseFloat(festivoHoursInput?.value) || 0;
  
  console.log('Valores de entrada:', { year, month, assignedHours, offdayHours });
  
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  console.log('Fechas actuales:', { currentDay, currentMonth, currentYear, totalDays });
  
  let totalMonthHoursValue = 0;
  let hoursSoFarValue = 0;
  let workdays = 0;
  let offDays = 0;
  let workdaysSoFar = 0;
  let offDaysSoFar = 0;
  
  // Configuración de días de la semana
  const weekdayConfig = {};
  weekdayIds.forEach(({ key, jsDay }) => {
    const switchEl = weekdaySwitches[key];
    const inputEl = weekdayHoursInputs[key];
    if (switchEl && inputEl) {
      weekdayConfig[jsDay] = {
        enabled: switchEl.checked,
        hours: parseFloat(inputEl.value) || 0
      };
    }
  });
  
  console.log('Configuración de días:', weekdayConfig);
  
  // Verificar si hay al menos un día configurado
  const hasConfiguredDays = Object.values(weekdayConfig).some(config => config.enabled && config.hours > 0);
  const hasOffdaysConfigured = includeOffdaysToggle?.checked && offdayHours > 0;
  
  console.log('Configuración válida:', { hasConfiguredDays, hasOffdaysConfigured });
  
  if (!hasConfiguredDays && !hasOffdaysConfigured) {
    // No hay configuración, mostrar mensaje
    if (resultsContainer) resultsContainer.style.display = "none";
    if (errorContainer) {
      errorContainer.innerHTML = '<div class="error">Por favor, configura al menos un día de la semana o activa los festivos/fines de semana</div>';
    }
    console.log('No hay configuración válida');
    return;
  }
  
  // Limpiar errores si hay configuración válida
  if (errorContainer) errorContainer.innerHTML = '';
  
  // Usar holidaysMataro en lugar de holidays
  const holidayDates = holidaysMataro.map(h => h.date);
  console.log('Festivos disponibles:', holidayDates);
  
  // Calcular días del mes
  for (let day = 1; day <= totalDays; day++) {
    const date = createLocalDate(year, month, day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHolidayDay = isHoliday(date, holidayDates);
    
    // Debug: Log para martes y jueves específicamente
    if (dayOfWeek === 2 || dayOfWeek === 4) { // Martes (2) o Jueves (4)
      console.log(`Día ${day} (${dayOfWeek === 2 ? 'Martes' : 'Jueves'}):`, {
        date: date.toISOString().split('T')[0],
        dateLocal: date.toLocaleDateString('es-ES'),
        dateUTC: date.toUTCString(),
        isWeekend,
        isHolidayDay,
        holidayName: isHolidayDay ? holidaysMataro.find(h => h.date === date.toISOString().split('T')[0])?.name : null,
        dayConfig: weekdayConfig[dayOfWeek],
        enabled: weekdayConfig[dayOfWeek]?.enabled,
        hours: weekdayConfig[dayOfWeek]?.hours
      });
    }
    
    if (isWeekend || isHolidayDay) {
      offDays++;
      if (hasOffdaysConfigured) {
        totalMonthHoursValue += offdayHours;
      }
      
      // Calcular horas hasta hoy
      if (day <= currentDay && month === currentMonth && year === currentYear) {
        offDaysSoFar++;
        if (hasOffdaysConfigured) {
          hoursSoFarValue += offdayHours;
        }
      }
    } else {
      const dayConfig = weekdayConfig[dayOfWeek];
      if (dayConfig && dayConfig.enabled && dayConfig.hours > 0) {
        workdays++;
        totalMonthHoursValue += dayConfig.hours;
        
        // Calcular horas hasta hoy
        if (day <= currentDay && month === currentMonth && year === currentYear) {
          workdaysSoFar++;
          hoursSoFarValue += dayConfig.hours;
        }
      }
    }
  }
  
  // Calcular balance
  const balance = totalMonthHoursValue - assignedHours;
  
  console.log('Resultados del cálculo:', {
    totalMonthHours: totalMonthHoursValue,
    hoursSoFar: hoursSoFarValue,
    workdays,
    offDays,
    workdaysSoFar,
    offDaysSoFar,
    balance,
    assignedHours
  });
  
  // Mostrar resultados
  if (resultsContainer) {
    resultsContainer.style.display = "block";
  }
  
  // Actualizar elementos de resultados
  if (totalMonthHours) {
    const formattedHours = formatHoursDisplay(totalMonthHoursValue);
    totalMonthHours.textContent = formattedHours;
    console.log('totalMonthHours actualizado:', formattedHours);
  }
  
  if (hoursSoFar) {
    const formattedHours = formatHoursDisplay(hoursSoFarValue);
    hoursSoFar.textContent = formattedHours;
    console.log('hoursSoFar actualizado:', formattedHours);
  }
  
  if (workdaysEl) {
    workdaysEl.textContent = `${workdays} días`;
    console.log('workdaysEl actualizado:', workdays);
  }
  
  if (offDaysEl) {
    offDaysEl.textContent = `${offDays} días`;
    console.log('offDaysEl actualizado:', offDays);
  }
  
  // Formatear balance
  const absBalance = Math.abs(balance);
  if (balanceValueEl) {
    const formattedBalance = formatHoursDisplay(absBalance);
    balanceValueEl.textContent = `${balance >= 0 ? '+' : '-'}${formattedBalance}`;
    console.log('balanceValueEl actualizado:', balanceValueEl.textContent);
    
    // Aplicar clases CSS según el valor del balance
    const balanceCard = balanceValueEl.closest('.balance-card');
    if (balanceCard) {
      // Remover clases anteriores
      balanceCard.classList.remove('positive', 'negative', 'neutral');
      
      // Aplicar clase según el valor
      if (balance > 0) {
        balanceCard.classList.add('positive');
      } else if (balance < 0) {
        balanceCard.classList.add('negative');
      } else {
        balanceCard.classList.add('neutral');
      }
    }
  }
  
  // Actualizar títulos
  if (totalMonthHoursTitle) {
    totalMonthHoursTitle.innerHTML = `<span aria-hidden="true">🗓️</span> Horas para <span id="monthNameTitle">${getMonthName(month)}</span> <span id="yearTitle">${year}</span>`;
  }
  
  // Guardar datos del cálculo para compartir
  window.lastCalculationData = {
    year: year,
    month: month,
    monthName: getMonthName(month),
    assignedHours: assignedHours,
    totalMonthHours: totalMonthHoursValue,
    hoursSoFar: hoursSoFarValue,
    workdays: workdays,
    offDays: offDays,
    balance: balance,
    offdayHours: offdayHours
  };
  
  console.log('✅ Cálculo completado y UI actualizada');
}

function getMonthName(month) {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[month];
}

// --- NUEVAS FUNCIONES DE COMPARTIR ---
function shareViaWhatsApp() {
  const data = window.lastCalculationData;
  if (!data) {
    alert('Primero debes calcular el balance');
    return;
  }
  
  const message = `📊 Balance de Horas - ${data.monthName} ${data.year}

🗓️ Horas asignadas: ${data.assignedHours} horas
✅ Horas realizadas hasta hoy: ${data.hoursSoFar.toFixed(2)} horas
💼 Días laborables: ${data.workdays} días
🎉 Fines de semana/Festivos: ${data.offDays} días
📈 Balance final del mes: ${data.balance >= 0 ? '+' : ''}${data.balance.toFixed(2)} horas

Calculado con la Calculadora de Horas de Servicio`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}

function shareViaEmail() {
  const data = window.lastCalculationData;
  if (!data) {
    alert('Primero debes calcular el balance');
    return;
  }
  
  const subject = `Balance de Horas - ${data.monthName} ${data.year}`;
  const body = `Hola,

Te comparto mi balance de horas para ${data.monthName} ${data.year}:

• Horas asignadas: ${data.assignedHours} horas
• Horas realizadas hasta hoy: ${data.hoursSoFar.toFixed(2)} horas
• Días laborables: ${data.workdays} días
• Fines de semana/Festivos: ${data.offDays} días
• Balance final del mes: ${data.balance >= 0 ? '+' : ''}${data.balance.toFixed(2)} horas

Saludos`;

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  window.location.href = mailtoUrl;
}

function addToCalendar() {
  const data = window.lastCalculationData;
  if (!data) {
    alert('Primero debes calcular el balance');
    return;
  }
  
  const startDate = new Date(data.year, data.month, 1);
  const endDate = new Date(data.year, data.month + 1, 0);
  
  const title = `Balance Horas - ${data.monthName} ${data.year}`;
  const description = `Horas asignadas: ${data.assignedHours}h | Total mes: ${data.totalMonthHours.toFixed(2)}h | Balance final: ${data.balance >= 0 ? '+' : ''}${data.balance.toFixed(2)}h`;
  
  // Crear evento para Google Calendar
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(description)}`;
  
  window.open(googleUrl, '_blank');
}

// --- MEJORAS DE ACCESIBILIDAD ---
function setupKeyboardNavigation() {
  // Navegación por teclado para switches
  weekdayIds.forEach(({ key }) => {
    const switchEl = weekdaySwitches[key];
    if (switchEl) {
      switchEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchEl.checked = !switchEl.checked;
          switchEl.dispatchEvent(new Event('change'));
        }
      });
    }
  });
  
  // Navegación por teclado para el toggle de festivos
  if (includeOffdaysToggle) {
    includeOffdaysToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        includeOffdaysToggle.checked = !includeOffdaysToggle.checked;
        includeOffdaysToggle.dispatchEvent(new Event('change'));
      }
    });
  }
  
  // Navegación por teclado para el toggle de lista de festivos
  if (toggleHolidayListBtn) {
    toggleHolidayListBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleHolidayList();
      }
    });
  }
}

function updateAriaAttributes() {
  // Actualizar aria-checked para switches
  weekdayIds.forEach(({ key }) => {
    const switchEl = weekdaySwitches[key];
    const switchLabel = switchEl?.closest('.switch');
    if (switchLabel) {
      switchLabel.setAttribute('aria-checked', switchEl.checked.toString());
    }
  });
  
  // Actualizar aria-checked para el toggle de festivos
  if (includeOffdaysToggle) {
    const switchLabel = includeOffdaysToggle.closest('.switch');
    if (switchLabel) {
      switchLabel.setAttribute('aria-checked', includeOffdaysToggle.checked.toString());
    }
  }
  
  // Actualizar aria-expanded para el toggle de lista de festivos
  if (toggleHolidayListBtn) {
    const isExpanded = holidayListContainer?.classList.contains('active');
    toggleHolidayListBtn.setAttribute('aria-expanded', isExpanded.toString());
  }
}

// --- FUNCIONES PARA EL TEMA ---
function initializeTheme() {
  // Cargar tema guardado o usar preferencia del sistema
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  } else if (prefersDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon('dark');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  if (themeIcon) {
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// --- FUNCIONES EXISTENTES MEJORADAS ---
function populateYearSelector() {
  if (!yearSelect) return;
  
  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';
  
  // Solo permitir años específicos: 2024, 2025, 2026
  const allowedYears = [2024, 2025, 2026];
  
  allowedYears.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  });
}

function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function initializeWeekdays() {
  weekdayIds.forEach(({ key, label }) => {
    const switchEl = document.getElementById(`weekday-${key}`);
    const inputEl = document.getElementById(`hours-${key}`);
    
    if (switchEl && inputEl) {
      weekdaySwitches[key] = switchEl;
      weekdayHoursInputs[key] = inputEl;
      
      // Llenar opciones de horas (solo si no está ya poblado)
      if (inputEl.options.length <= 1) {
        fillHourSelect(inputEl, 24, 0.25);
      }
      
      // NO añadir event listeners aquí - se harán en setupEventListeners
    }
  });
  
  // NO añadir event listeners aquí - se harán en setupEventListeners
}

function toggleHolidayList() {
  if (holidayListContainer) {
    const isActive = holidayListContainer.classList.contains('active');
    holidayListContainer.classList.toggle('active');
    
    if (toggleHolidayListBtn) {
      toggleHolidayListBtn.textContent = isActive ? '🎉 Mostrar festivos' : '🎉 Ocultar festivos';
    }
    
    updateAriaAttributes();
  }
}

function renderHolidayList() {
  const holidayList = document.getElementById('holidayList');
  if (!holidayList) {
    console.warn('⚠️ Elemento holidayList no encontrado');
    return;
  }
  
  // Crear un Map para deduplicar por fecha
  const uniqueHolidays = new Map();
  
  // Procesar festivos en orden: básicos, de Mataró, personalizados
  const allHolidays = [...getBasicHolidays(new Date().getFullYear()), ...holidaysMataro.filter(h => h.source === 'Mataró'), ...customHolidays];
  
  allHolidays.forEach(holiday => {
    // Usar fecha como clave para deduplicar
    if (!uniqueHolidays.has(holiday.date)) {
      uniqueHolidays.set(holiday.date, holiday);
    } else {
      // Si ya existe, priorizar festivos de Mataró sobre básicos
      const existing = uniqueHolidays.get(holiday.date);
      if (holiday.source === 'Mataró' && existing.source !== 'Mataró') {
        uniqueHolidays.set(holiday.date, holiday);
        console.log(`🔄 Reemplazando festivo básico con festivo de Mataró: ${holiday.date} - ${holiday.name}`);
      }
    }
  });
  
  const uniqueHolidaysArray = Array.from(uniqueHolidays.values());
  console.log('🎉 Festivos únicos para mostrar:', uniqueHolidaysArray.length);
  console.log('📅 Festivos de Mataró incluidos:', uniqueHolidaysArray.filter(h => h.source === 'Mataró'));
  
  // Ordenar por fecha
  uniqueHolidaysArray.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  holidayList.innerHTML = '';
  
  uniqueHolidaysArray.forEach(holiday => {
    const li = document.createElement('li');
    const holidayDate = new Date(holiday.date);
    const isPast = holidayDate < new Date();
    
    // Determinar el tipo de festivo para el estilo
    let sourceClass = '';
    let sourceIcon = '';
    let sourceText = '';
    
    if (holiday.source === 'Mataró') {
      sourceClass = 'festivo-mataro';
      sourceIcon = '🏛️';
      sourceText = 'Festivo local de Mataró';
    } else if (holiday.source === 'custom') {
      sourceClass = 'festivo-personalizado';
      sourceIcon = '📝';
      sourceText = 'Festivo personalizado';
    } else {
      sourceClass = 'festivo-basico';
      sourceIcon = '📅';
      sourceText = 'Festivo nacional';
    }
    
    li.className = `festivo-card ${sourceClass} ${isPast ? 'festivo-pasado' : ''}`;
    
    const formattedDate = formatDateForDisplay(holidayDate);
    
    // Solo mostrar botón de eliminar para festivos personalizados
    const deleteButton = holiday.source === 'custom' ? 
      `<button class="btn btn-secondary" onclick="deleteCustomHoliday('${holiday.date}')" aria-label="Eliminar festivo ${holiday.name}">
        <span aria-hidden="true">🗑️</span>
      </button>` : '';
    
    li.innerHTML = `
      <div>
        <div class="festivo-fecha">
          ${sourceIcon} ${formattedDate}
        </div>
        <div class="festivo-nombre">${holiday.name}</div>
        <div class="festivo-source">${sourceText}</div>
      </div>
      <div class="festivo-actions">
        ${deleteButton}
      </div>
    `;
    
    holidayList.appendChild(li);
  });
}

function formatDateForDisplay(date) {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('es-ES', options);
}

function removeHoliday(date, name) {
  customHolidays = customHolidays.filter(h => !(h.date === date && h.name === name));
  saveCustomHolidays();
  updateHolidays();
  renderHolidayList();
}

function updateHolidays() {
  const year = parseInt(yearSelect?.value || new Date().getFullYear());
  
  // Limpiar caché cuando cambia el año para forzar recarga
  localStorage.removeItem(MATARO_CACHE_KEY);
  
  const basicHolidays = getBasicHolidays(year);
  const mataroHolidays = getMataroHolidays(year);
  
  // Combinar festivos básicos, de Mataró y personalizados
  holidays = [
    ...basicHolidays.map(h => h.date),
    ...mataroHolidays.map(h => h.date),
    ...customHolidays.map(h => h.date)
  ];
  
  // Actualizar holidaysMataro para la visualización
  holidaysMataro = [...basicHolidays, ...mataroHolidays, ...customHolidays];
  
  // Actualizar la lista visual de festivos
  renderHolidayList();
  
  debouncedCalculateBalance();
}

// Función de prueba para verificar elementos del DOM
function testDOMElements() {
  console.log('=== PRUEBA DE ELEMENTOS DEL DOM ===');
  
  const elements = {
    'totalMonthHours': document.getElementById('totalMonthHours'),
    'hoursSoFar': document.getElementById('hoursSoFar'),
    'workdays': document.getElementById('workdays'),
    'offDays': document.getElementById('offDays'),
    'balanceValue': document.getElementById('balanceValue'),
    'balanceText': document.getElementById('balanceText'),
    'results-container': document.getElementById('results-container')
  };
  
  console.log('Elementos encontrados:', elements);
  
  // Verificar si los elementos existen
  Object.entries(elements).forEach(([name, element]) => {
    if (element) {
      console.log(`✅ ${name}: encontrado, contenido actual: "${element.textContent}"`);
    } else {
      console.error(`❌ ${name}: NO encontrado`);
    }
  });
  
  console.log('=== FIN PRUEBA DOM ===');
}

// Función de prueba para verificar cálculos
function testCalculation() {
  console.log('=== PRUEBA DE CÁLCULO MANUAL PARA MATARÓ ===');
  
  const year = 2025;
  const month = 6; // Julio (0-indexed)
  const assignedHours = 86;
  const offdayHours = 1.5;
  const workdayHours = 3.5;
  const currentDay = 20; // Domingo 20 de julio
  
  const totalDays = new Date(year, month + 1, 0).getDate();
  console.log(`Días totales en julio 2025: ${totalDays}`);
  console.log(`Día actual: ${currentDay} de julio`);
  
  let workdays = 0;
  let offDays = 0;
  let workdaysSoFar = 0;
  let offDaysSoFar = 0;
  
  // Contar días laborables vs festivos/fines de semana
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHolidayDay = isHoliday(date, holidays);
    
    if (isWeekend || isHolidayDay) {
      offDays++;
      if (day <= currentDay) {
        offDaysSoFar++;
      }
    } else {
      workdays++;
      if (day <= currentDay) {
        workdaysSoFar++;
      }
    }
  }
  
  console.log(`Días laborables totales: ${workdays}`);
  console.log(`Fines de semana y festivos totales: ${offDays}`);
  console.log(`Días laborables hasta hoy: ${workdaysSoFar}`);
  console.log(`Fines de semana y festivos hasta hoy: ${offDaysSoFar}`);
  
  const totalMonthHours = (workdays * workdayHours) + (offDays * offdayHours);
  const hoursSoFar = (workdaysSoFar * workdayHours) + (offDaysSoFar * offdayHours);
  const balance = totalMonthHours - assignedHours;
  
  console.log(`Total horas del mes: ${totalMonthHours}`);
  console.log(`Horas realizadas hasta hoy: ${hoursSoFar}`);
  console.log(`Balance del mes: ${balance}`);
  
  // Verificar específicamente el 28 de julio
  const festivo28Julio = new Date(2025, 6, 28);
  const is28JulioFestivo = isHoliday(festivo28Julio, holidays);
  console.log(`¿28 de julio es festivo? ${is28JulioFestivo}`);
  
  console.log('=== FIN PRUEBA ===');
  
  return {
    workdays,
    offDays,
    workdaysSoFar,
    offDaysSoFar,
    totalMonthHours,
    hoursSoFar,
    balance
  };
}

// --- FESTIVOS BÁSICOS ---
function getBasicHolidays(year) {
  return [
    { date: `${year}-01-01`, name: 'Any Nou' },
    { date: `${year}-01-06`, name: 'Reis' },
    { date: `${year}-05-01`, name: 'Festa del Treball' },
    { date: `${year}-08-15`, name: 'L\'Assumpció' },
    { date: `${year}-10-12`, name: 'Festa Nacional d\'Espanya' },
    { date: `${year}-11-01`, name: 'Tots Sants' },
    { date: `${year}-12-06`, name: 'Dia de la Constitució' },
    { date: `${year}-12-08`, name: 'La Immaculada' },
    { date: `${year}-12-25`, name: 'Nadal' }
  ];
}

// Función para obtener festivos específicos de Mataró por año
function getMataroHolidays(year) {
  switch (year) {
    case 2025:
      return [
        { date: '2025-01-01', name: 'Cap d\'Any', source: 'Mataró' },
        { date: '2025-01-06', name: 'Reis', source: 'Mataró' },
        { date: '2025-04-18', name: 'Divendres Sant', source: 'Mataró' },
        { date: '2025-04-21', name: 'Dilluns de Pasqua Florida', source: 'Mataró' },
        { date: '2025-05-01', name: 'Festa del Treball', source: 'Mataró' },
        { date: '2025-06-09', name: 'Fira a Mataró', source: 'Mataró' },
        { date: '2025-06-24', name: 'Sant Joan', source: 'Mataró' },
        { date: '2025-07-28', name: 'Festa major de Les Santes', source: 'Mataró' },
        { date: '2025-08-15', name: 'L\'Assumpció', source: 'Mataró' },
        { date: '2025-09-11', name: 'Diada Nacional de Catalunya', source: 'Mataró' },
        { date: '2025-11-01', name: 'Tots Sants', source: 'Mataró' },
        { date: '2025-12-06', name: 'Dia de la Constitució', source: 'Mataró' },
        { date: '2025-12-08', name: 'La Immaculada', source: 'Mataró' },
        { date: '2025-12-25', name: 'Nadal', source: 'Mataró' },
        { date: '2025-12-26', name: 'Sant Esteve', source: 'Mataró' }
      ];
    case 2026:
      return [
        { date: '2026-01-01', name: 'Cap d\'Any', source: 'Mataró' },
        { date: '2026-01-06', name: 'Reis', source: 'Mataró' },
        { date: '2026-04-03', name: 'Divendres Sant', source: 'Mataró' },
        { date: '2026-04-06', name: 'Dilluns de Pasqua Florida', source: 'Mataró' },
        { date: '2026-05-01', name: 'Festa del Treball', source: 'Mataró' },
        { date: '2026-06-09', name: 'Fira a Mataró', source: 'Mataró' },
        { date: '2026-06-24', name: 'Sant Joan', source: 'Mataró' },
        { date: '2026-07-28', name: 'Festa major de Les Santes', source: 'Mataró' },
        { date: '2026-08-15', name: 'L\'Assumpció', source: 'Mataró' },
        { date: '2026-09-11', name: 'Diada Nacional de Catalunya', source: 'Mataró' },
        { date: '2026-11-01', name: 'Tots Sants', source: 'Mataró' },
        { date: '2026-12-06', name: 'Dia de la Constitució', source: 'Mataró' },
        { date: '2026-12-08', name: 'La Immaculada', source: 'Mataró' },
        { date: '2026-12-25', name: 'Nadal', source: 'Mataró' },
        { date: '2026-12-26', name: 'Sant Esteve', source: 'Mataró' }
      ];
    case 2024:
      // Para 2024 solo festivos nacionales básicos
      return [];
    default:
      return [];
  }
}

function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

async function initializeApp() {
  try {
    // Inicializar tema
    initializeTheme();
    
    // Inicializar elementos DOM
    initializeDOMElements();
    
    // Configurar controles básicos
    setupBasicControls();
    
    // Inicializar SlimSelect
    initializeSlimSelects();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Cargar festivos básicos inmediatamente
    const currentYear = new Date().getFullYear();
    holidaysMataro = getBasicHolidays(currentYear);
    
    // Actualizar festivos y calcular balance inicial
    updateHolidays();
    renderHolidayList();
    
    // Realizar cálculo inicial
    calculateBalance();
    
    // Cargar festivos de Mataró en segundo plano (sin bloquear)
    loadHolidaysInBackground();
    
    // Actualizar atributos ARIA
    updateAriaAttributes();
    
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
    showError('Error al cargar la aplicación. Por favor, recarga la página.');
  }
}

async function loadMataroHolidays() {
  try {
    // Intentar cargar desde caché
    const cached = localStorage.getItem(MATARO_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < MATARO_CACHE_TTL) {
        holidaysMataro = data;
        console.log('Festivos de Mataró cargados desde caché:', holidaysMataro.length);
        return;
      }
    }
    
    console.log('Cargando festivos de Mataró desde la web...');
    
    // Cargar desde la API
    const response = await fetch(MATARO_HOLIDAYS_URL);
    if (!response.ok) {
      throw new Error('Error cargando festivos de Mataró');
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Buscar festivos en diferentes formatos posibles
    const holidayElements = doc.querySelectorAll('.festivo-item, .holiday-item, [class*="festivo"], [class*="holiday"]');
    holidaysMataro = [];
    
    if (holidayElements.length === 0) {
      // Si no encuentra elementos específicos, buscar en el texto completo
      const text = doc.body.textContent;
      const currentYear = new Date().getFullYear();
      
      // Buscar patrones de fechas en el texto
      const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,  // DD/MM/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/g,   // DD-MM-YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/g,   // YYYY-MM-DD
        /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/g  // DD de MES de YYYY
      ];
      
      const monthNames = {
        'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
      };
      
      datePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          let day, month, year;
          
          if (pattern.source.includes('de')) {
            // Formato: DD de MES de YYYY
            day = parseInt(match[1]);
            month = monthNames[match[2].toLowerCase()];
            year = parseInt(match[3]);
          } else if (pattern.source.includes('YYYY')) {
            // Formato: YYYY-MM-DD
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          } else {
            // Formato: DD/MM/YYYY o DD-MM-YYYY
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          }
          
          if (year === currentYear && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
              holidaysMataro.push({
                date: formatDate(date),
                name: `Festivo Local ${day}/${month}/${year}`
              });
            }
          }
        }
      });
    } else {
      holidayElements.forEach(element => {
        const dateText = element.querySelector('.festivo-fecha, .holiday-date, [class*="fecha"], [class*="date"]')?.textContent?.trim();
        const nameText = element.querySelector('.festivo-nombre, .holiday-name, [class*="nombre"], [class*="name"]')?.textContent?.trim();
        
        if (dateText) {
          const date = parseMataroDate(dateText);
          if (date) {
            holidaysMataro.push({
              date: formatDate(date),
              name: nameText || `Festivo Local ${formatDate(date)}`
            });
          }
        }
      });
    }
    
    // Añadir festivos específicos de Mataró 2025
    const mataroSpecific2025 = [
      { date: '2025-07-28', name: 'Festa Major de Mataró' },
      { date: '2025-08-15', name: 'Festa Major de Mataró' },
      { date: '2025-09-11', name: 'Diada de Catalunya' }
    ];
    
    holidaysMataro = [...holidaysMataro, ...mataroSpecific2025];
    
    console.log('Festivos de Mataró cargados:', holidaysMataro);
    console.log('Festivo 28 de julio incluido:', holidaysMataro.find(h => h.date === '2025-07-28'));
    
    // Guardar en caché
    localStorage.setItem(MATARO_CACHE_KEY, JSON.stringify({
      data: holidaysMataro,
      timestamp: Date.now()
    }));
    
  } catch (error) {
    console.error('Error cargando festivos de Mataró:', error);
    // Usar festivos básicos como fallback
    holidaysMataro = [];
  }
}

function parseMataroDate(dateText) {
  if (!dateText) return null;
  
  // Limpiar el texto
  const cleanText = dateText.trim().toLowerCase();
  
  // Patrones de fecha comunes
  const patterns = [
    // DD/MM/YYYY
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
    // DD-MM-YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/g,
    // YYYY-MM-DD
    /(\d{4})-(\d{1,2})-(\d{1,2})/g,
    // DD de MES de YYYY
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/g,
    // DD MES YYYY
    /(\d{1,2})\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})/
  ];
  
  const monthNames = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
  };
  
  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      let day, month, year;
      
      if (pattern.source.includes('de') || pattern.source.includes('enero|febrero')) {
        // Formato con nombre de mes
        day = parseInt(match[1]);
        month = monthNames[match[2]];
        year = parseInt(match[3]);
      } else if (pattern.source.includes('YYYY')) {
        // Formato: YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        // Formato: DD/MM/YYYY o DD-MM-YYYY
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      
      if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return date;
        }
      }
    }
  }
  
  return null;
}

async function resetApp() {
  if (confirm('¿Estás seguro de que quieres resetear todos los valores?')) {
    // Resetear formulario
    if (monthSelect) monthSelect.value = new Date().getMonth();
    if (assignedHoursInput) assignedHoursInput.value = '';
    
    // Resetear días de la semana
    weekdayIds.forEach(({ key }) => {
      const switchEl = weekdaySwitches[key];
      const inputEl = weekdayHoursInputs[key];
      if (switchEl) {
        switchEl.checked = false;
        if (inputEl) {
          inputEl.style.display = 'none';
          inputEl.value = '';
        }
      }
    });
    
    // Resetear toggle de festivos
    if (includeOffdaysToggle) {
      includeOffdaysToggle.checked = false;
      if (festivoHoursGroup) {
        festivoHoursGroup.style.display = 'none';
      }
    }
    
    // Ocultar resultados
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
    }
    
    // Actualizar SlimSelect
    Object.values(slimSelectInstances).forEach(instance => {
      if (instance && instance.set) {
        instance.set('');
      }
    });
    
    // Actualizar atributos ARIA
    updateAriaAttributes();
    
    // Limpiar errores
    if (errorContainer) {
      errorContainer.innerHTML = '';
    }
  }
}

function clearCache() {
  if (confirm('¿Estás seguro de que quieres limpiar el caché de festivos?')) {
    localStorage.removeItem(MATARO_CACHE_KEY);
    holidaysMataro = [];
    updateHolidays();
    alert('Caché limpiado correctamente');
  }
}

// --- INICIALIZACIÓN AUTOMÁTICA ---
// Event listener para cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// Event listener para cuando la página esté completamente cargada
window.addEventListener('load', function() {
  hideLoading();
});

function setupBasicControls() {
  // Configurar elementos básicos
  populateYearSelector();
  
  // Llenar opciones de horas
  fillHourSelect(assignedHoursInput, 400, 0.5);
  if (festivoHoursInput) {
    fillHourSelect(festivoHoursInput, 24, 0.25);
  }
  
  // Inicializar días de la semana
  initializeWeekdays();
  
  // Configurar navegación por teclado
  setupKeyboardNavigation();
  
  // Cargar festivos personalizados
  loadCustomHolidays();
  
  // Configurar fecha actual
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  if (yearSelect) yearSelect.value = currentYear;
  if (monthSelect) monthSelect.value = currentMonth;
}

function setupEventListeners() {
  // Event listeners principales
  if (yearSelect) yearSelect.addEventListener('change', updateHolidays);
  if (monthSelect) monthSelect.addEventListener('change', debouncedCalculateBalance);
  if (assignedHoursInput) assignedHoursInput.addEventListener('change', debouncedCalculateBalance);
  if (calculateBtn) calculateBtn.addEventListener('click', calculateBalance);
  if (resetBtn) resetBtn.addEventListener('click', resetApp);
  if (clearCacheBtn) clearCacheBtn.addEventListener('click', clearCache);
  
  // Event listeners para compartir
  if (shareWhatsAppBtn) shareWhatsAppBtn.addEventListener('click', shareViaWhatsApp);
  if (shareEmailBtn) shareEmailBtn.addEventListener('click', shareViaEmail);
  if (addToCalendarBtn) addToCalendarBtn.addEventListener('click', addToCalendar);
  
  // Event listener para el tema
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  
  // Configurar formulario de festivos personalizados
  if (addHolidayForm) {
    addHolidayForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const date = customHolidayDate.value;
      const name = customHolidayName.value.trim();
      
      if (!date || !name) {
        alert('Por favor, completa todos los campos');
        return;
      }
      
      // Verificar si ya existe
      const exists = customHolidays.some(h => h.date === date && h.name === name);
      if (exists) {
        alert('Este festivo ya existe');
        return;
      }
      
      customHolidays.push({ date, name });
      saveCustomHolidays();
      updateHolidays();
      renderHolidayList();
      
      // Limpiar formulario
      customHolidayDate.value = '';
      customHolidayName.value = '';
      customHolidayName.focus();
    });
  }
  
  // Event listener para mostrar/ocultar lista de festivos
  if (toggleHolidayListBtn) {
    toggleHolidayListBtn.addEventListener('click', toggleHolidayList);
  }
  
  // Event listeners para días de la semana
  weekdayIds.forEach(({ key, jsDay }) => {
    const switchEl = weekdaySwitches[key];
    const inputEl = weekdayHoursInputs[key];
    
    if (switchEl) {
      switchEl.addEventListener('change', () => {
        if (inputEl) {
          inputEl.style.display = switchEl.checked ? 'block' : 'none';
          // NO resetear automáticamente el valor
        }
        debouncedCalculateBalance();
      });
    }
    
    if (inputEl) {
      inputEl.addEventListener('change', debouncedCalculateBalance);
    }
  });
  
  // Event listener para festivos/fines de semana
  if (includeOffdaysToggle) {
    includeOffdaysToggle.addEventListener('change', () => {
      if (festivoHoursGroup) {
        festivoHoursGroup.style.display = includeOffdaysToggle.checked ? 'block' : 'none';
        // NO resetear automáticamente el valor
      }
      debouncedCalculateBalance();
    });
  }
  
  if (festivoHoursInput) {
    festivoHoursInput.addEventListener('change', debouncedCalculateBalance);
  }
}

function loadCustomHolidays() {
  try {
    const saved = localStorage.getItem('customHolidays');
    if (saved) {
      customHolidays = JSON.parse(saved);
    } else {
      customHolidays = [];
    }
  } catch (error) {
    console.error('❌ Error cargando festivos personalizados:', error);
    customHolidays = [];
  }
}

function saveCustomHolidays() {
  try {
    localStorage.setItem('customHolidays', JSON.stringify(customHolidays));
  } catch (error) {
    console.error('❌ Error guardando festivos personalizados:', error);
  }
}

async function loadHolidaysInBackground() {
  try {
    const currentYear = parseInt(yearSelect?.value || new Date().getFullYear());
    
    // Obtener festivos según el año seleccionado
    const basicHolidays = getBasicHolidays(currentYear);
    const mataroHolidays = getMataroHolidays(currentYear);
    
    // Combinar festivos básicos, de Mataró y personalizados
    holidaysMataro = [...basicHolidays, ...mataroHolidays, ...customHolidays];
    
    // Guardar en caché
    localStorage.setItem(MATARO_CACHE_KEY, JSON.stringify({
      data: holidaysMataro,
      timestamp: Date.now()
    }));
    
    // Actualizar UI
    updateHolidays();
    renderHolidayList();
    calculateBalance();
    
  } catch (error) {
    console.error('❌ Error cargando festivos:', error);
    
    // Fallback con festivos básicos
    const currentYear = parseInt(yearSelect?.value || new Date().getFullYear());
    const basicHolidays = getBasicHolidays(currentYear);
    const mataroHolidays = getMataroHolidays(currentYear);
    holidaysMataro = [...basicHolidays, ...mataroHolidays, ...customHolidays];
    
    updateHolidays();
    renderHolidayList();
    calculateBalance();
  }
}

// Función global para limpiar caché de festivos de Mataró (útil para debugging)
window.clearMataroCache = function() {
  console.log('🗑️ Limpiando caché de festivos de Mataró...');
  localStorage.removeItem(MATARO_CACHE_KEY);
  console.log('✅ Caché limpiado. Recarga la página para cargar festivos oficiales de Mataró 2025.');
};



// Función global para limpiar caché de festivos de Mataró
window.clearMataroCache = function() {
  console.log('🗑️ Limpiando caché de festivos de Mataró...');
  localStorage.removeItem(MATARO_CACHE_KEY);
  console.log('✅ Caché limpiado. Recarga la página para cargar festivos oficiales de Mataró 2025.');
};


