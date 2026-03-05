# CronosApp

CronosApp es una Progressive Web App (PWA) diseñada para el control de tiempos de equipos técnicos multisede. Esta aplicación permite a los usuarios realizar un seguimiento eficiente del tiempo dedicado a diferentes proyectos y tareas, facilitando la gestión y la sincronización de datos entre múltiples ubicaciones.

## Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

```
CronosApp
├── src
│   ├── index.html          # Punto de entrada de la aplicación
│   ├── css
│   │   └── styles.css      # Estilos globales utilizando Tailwind CSS
│   ├── js
│   │   ├── app.js          # Script principal de la aplicación
│   │   ├── db.js           # Manejo de la base de datos (IndexedDB)
│   │   └── ui.js           # Funciones para la interfaz de usuario
│   ├── components
│   │   ├── timer.js        # Componente para el temporizador
│   │   ├── team-list.js    # Componente para la lista de equipos
│   │   ├── site-selector.js # Componente para seleccionar el sitio
│   │   └── report-view.js   # Componente para ver informes
│   ├── services
│   │   ├── time-tracking.js # Funciones para el seguimiento del tiempo
│   │   ├── sync-service.js   # Sincronización de datos con el servidor
│   │   └── notification-service.js # Gestión de notificaciones
│   └── utils
│       └── helpers.js       # Funciones utilitarias
├── public
│   ├── manifest.json        # Manifiesto de la PWA
│   └── service-worker.js     # Servicio de trabajador para funcionalidad offline
├── package.json             # Configuración del proyecto para npm
└── README.md                # Documentación del proyecto
```

## Instalación

Para instalar y ejecutar la aplicación, sigue estos pasos:

1. Clona el repositorio:
   ```
   git clone <URL_DEL_REPOSITORIO>
   ```

2. Navega al directorio del proyecto:
   ```
   cd CronosApp
   ```

3. Instala las dependencias:
   ```
   npm install
   ```

4. Inicia la aplicación:
   ```
   npm start
   ```

## Uso

Una vez que la aplicación esté en funcionamiento, podrás acceder a ella a través de tu navegador. La interfaz te permitirá gestionar el tiempo de tus equipos, seleccionar sitios de trabajo y generar informes de seguimiento.

## Contribuciones

Las contribuciones son bienvenidas. Si deseas contribuir a este proyecto, por favor abre un issue o envía un pull request.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.