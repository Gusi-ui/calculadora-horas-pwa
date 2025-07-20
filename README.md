# 🕒 Calculadora de Horas de Servicio

Una aplicación web moderna y accesible para calcular el balance de horas mensuales según tu plan de trabajo.

## ✨ Características Principales

### 📊 Cálculo Inteligente
- **Configuración flexible**: Define horarios diferentes para cada día de la semana
- **Gestión de festivos**: Incluye festivos oficiales y personalizados
- **Cálculo automático**: Balance en tiempo real con horas asignadas vs. realizadas
- **Fines de semana**: Opción para incluir o excluir fines de semana y festivos

### 🎯 Funcionalidades Avanzadas
- **Festivos personalizados**: Añade tus propios festivos específicos
- **Caché inteligente**: Almacenamiento local de festivos para mejor rendimiento
- **Persistencia de datos**: Tus configuraciones se guardan automáticamente
- **Cálculo en tiempo real**: Resultados actualizados automáticamente

### 📱 Experiencia Móvil Mejorada
- **Diseño responsive**: Optimizado para móviles, tablets y desktop
- **Gestos táctiles**: Interfaz optimizada para dispositivos táctiles
- **Modo landscape**: Adaptación perfecta para orientación horizontal
- **PWA instalable**: Instala como aplicación nativa en tu dispositivo

### ♿ Accesibilidad Completa
- **Navegación por teclado**: Control completo sin necesidad de ratón
- **Lectores de pantalla**: Compatible con tecnologías asistivas
- **Contraste mejorado**: Soporte para preferencias de alto contraste
- **Textos alternativos**: Descripciones para todos los elementos visuales
- **Estructura semántica**: HTML bien estructurado para mejor accesibilidad

### 🔗 Integración Móvil
- **Compartir por WhatsApp**: Envía resultados directamente a WhatsApp
- **Compartir por Email**: Genera emails con el balance de horas
- **Añadir al calendario**: Crea eventos en Google Calendar automáticamente
- **Widgets**: Acceso rápido desde la pantalla de inicio (PWA)

## 🚀 Instalación y Uso

### Instalación Local
1. Clona o descarga el repositorio
2. Abre `index.html` en tu navegador
3. ¡Listo para usar!

### Instalación como PWA
1. Abre la aplicación en Chrome/Edge
2. Haz clic en el icono de instalación en la barra de direcciones
3. La aplicación se instalará como una app nativa

## 📋 Cómo Usar

### 1. Configuración Básica
- Selecciona el **año** y **mes** para calcular
- Define las **horas asignadas** para ese mes

### 2. Configuración de Días
- Activa los días de la semana que trabajas
- Define las horas para cada día activo
- Opcional: incluye fines de semana y festivos

### 3. Gestión de Festivos
- Los festivos oficiales se cargan automáticamente
- Añade festivos personalizados con fecha y nombre
- Visualiza todos los festivos del mes

### 4. Resultados y Compartir
- Revisa el balance calculado automáticamente
- Comparte resultados por WhatsApp, Email o añade al calendario
- Los datos se actualizan en tiempo real

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica y accesible
- **CSS3**: Diseño responsive con CSS Grid y Flexbox
- **JavaScript ES6+**: Funcionalidad moderna y modular
- **SlimSelect**: Selectores personalizados y accesibles
- **Service Worker**: Funcionalidad offline y PWA
- **Web App Manifest**: Instalación como aplicación nativa

## 📱 Compatibilidad

### Navegadores Soportados
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

### Dispositivos
- ✅ Móviles (iOS/Android)
- ✅ Tablets
- ✅ Desktop
- ✅ Smart TVs (navegadores web)

## 🔧 Personalización

### Añadir Festivos Personalizados
```javascript
// Los festivos se guardan automáticamente en localStorage
// Formato: { date: "YYYY-MM-DD", name: "Nombre del festivo" }
```

### Modificar Horarios
- Los horarios se pueden cambiar dinámicamente
- Los cambios se reflejan inmediatamente en el cálculo
- La configuración se guarda automáticamente

## 🎨 Características de Diseño

### Responsive Design
- **Mobile First**: Diseño optimizado para móviles
- **Breakpoints**: 480px, 768px, 1024px, 1200px
- **Flexible Grid**: Adaptación automática a cualquier pantalla

### Accesibilidad
- **WCAG 2.1 AA**: Cumple estándares de accesibilidad
- **Navegación por teclado**: Tab, Enter, Espacio
- **ARIA labels**: Etiquetas descriptivas para lectores de pantalla
- **Contraste**: Mínimo 4.5:1 para texto normal

### PWA Features
- **Offline**: Funciona sin conexión a internet
- **Instalable**: Se puede instalar como app nativa
- **Notificaciones**: Soporte para notificaciones push
- **Sincronización**: Sincronización en segundo plano

## 📊 Estructura del Proyecto

```
fechahora/
├── index.html              # Página principal
├── main.js                 # Lógica de la aplicación
├── sw.js                   # Service Worker
├── css/
│   └── sheet.css          # Estilos principales
├── data/
│   └── holidays.json      # Festivos oficiales
├── favicons/              # Iconos para PWA
│   ├── favicon.svg
│   ├── favicon-96x96.png
│   ├── apple-touch-icon.png
│   └── site.webmanifest
└── README.md
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**Gusi** - Desarrollador de la aplicación

Hecho con ❤️ para facilitar la gestión de horas de trabajo.

---

## 🆕 Novedades en la Versión 3.9

### ✨ Nuevas Funcionalidades
- **Compartir resultados**: WhatsApp, Email y Google Calendar
- **PWA completa**: Instalable como aplicación nativa
- **Accesibilidad mejorada**: Navegación por teclado completa
- **Responsive design**: Mejor adaptación a tablets y landscape

### 🔧 Mejoras Técnicas
- **Service Worker**: Funcionalidad offline
- **ARIA attributes**: Mejor soporte para lectores de pantalla
- **Gestos táctiles**: Optimización para dispositivos móviles
- **Contraste mejorado**: Soporte para preferencias de accesibilidad

### 🎨 Mejoras de UX
- **Botones de compartir**: Acceso rápido a funcionalidades sociales
- **Navegación mejorada**: Skip links y focus management
- **Feedback visual**: Mejor respuesta a interacciones
- **Modo oscuro**: Soporte para preferencias del sistema
