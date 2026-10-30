# Notificador de Incidentes

Archivos:

| Archivo | Para qué sirve |
|---|---|
| `Notificador de Incidentes.html` | El notificador + dashboard. Se abre con doble clic (Chrome o Edge). |
| `Incidentes_compartido.xlsx` | Plantilla del Excel compartido (hoja y tabla llamadas **Incidentes**). |
| `google-apps-script.gs` | Conector si prefieres usar Google Sheets en lugar de Excel 365. |

## Cómo se usa

1. Abre `Notificador de Incidentes.html`.
2. Clic en **Dynamics**, **EstaQueue** o **WhatsApp**. La fecha y hora se toman en el momento exacto del clic (al segundo).
3. Elige severidad, escribe una descripción (opcional) y **Registrar incidente**.
4. El incidente aparece en el dashboard y se envía al Excel compartido. Si no hay internet queda como "⏳ Pendiente" y se reenvía solo.

En ⚙️ Configuración se puede activar el **registro rápido**: un clic registra sin abrir el formulario.

El dashboard se actualiza cada minuto con lo que reportan los compañeros y avisa con sonido y notificación de escritorio.

---

## Opción A: Excel en OneDrive / SharePoint (Microsoft 365 + Power Automate)

> Requiere el conector **"Cuando se recibe una solicitud HTTP"**, que es **Premium** en Power Automate. Si tu empresa no tiene esa licencia, usa la Opción B.

### Camino rápido: importar el flujo ya hecho (recomendado)

1. **Excel:** el archivo debe tener una **tabla** llamada `Incidentes` con estos encabezados exactos:
   `ID | Fecha | Hora | Aplicativo | Severidad | Descripción | Reportado por | Marca de tiempo ISO`.
   Lo más fácil es subir `Incidentes_compartido.xlsx` a tu OneDrive y compartir ese.
2. Entra a https://make.powerautomate.com → **Mis flujos** → **Importar** → **Importar paquete (heredado)** → elige `Flujo_Notificador_Incidentes.zip`.
3. En "Revisar el contenido del paquete":
   - En el flujo, clic en la llave inglesa y elige **Crear como nuevo**.
   - En "Conexión de Excel Online (Business)", elige tu cuenta (o "Crear nuevo" e inicia sesión). Luego **Importar**.
4. Abre el flujo importado → **Editar**. Hay dos acciones de Excel: **Listar filas** (dentro de "Si es verdadero") y **Agregar fila** (dentro de "Si es falso"). En cada una elige:
   - Ubicación: **OneDrive for Business**
   - Biblioteca de documentos: **OneDrive**
   - Archivo: tu Excel de incidentes
   - Tabla: **Incidentes**

   En "Agregar fila" revisa que cada columna siga con su dato (ID, Fecha, Hora…). Luego **Guardar**.
5. Abre el disparador **Cuando se recibe una solicitud HTTP** y copia la **URL HTTP POST**.
6. En `Notificador de Incidentes.html` → ⚙️ → **Excel en OneDrive / SharePoint (Power Automate)** → pega la URL → **Probar conexión** → **Guardar**.

¡Listo! Esa única URL registra y lee los incidentes. Comparte esa misma URL con tus compañeros.

### Qué hace el flujo (por si lo quieres crear a mano)

- Disparador **Cuando se recibe una solicitud HTTP** (Quién puede desencadenar: Cualquiera, sin esquema).
- **Redactar** llamado `Datos` con la expresión `json(string(triggerBody()))`.
- **Condición**: `outputs('Datos')?['accion']` es igual a `leer`.
  - Sí → **Enumerar filas presentes en una tabla** (tabla Incidentes) → **Respuesta** 200 con el `value` de las filas.
  - No → **Agregar una fila a una tabla** con `outputs('Datos')?['id']`, `['fecha']`, `['hora']`, `['aplicativo']`, `['severidad']`, `['descripcion']`, `['reportadoPor']`, `['timestamp']` → **Respuesta** 200 `{"ok": true}`.
- Las dos respuestas llevan el encabezado `Access-Control-Allow-Origin: *`.

---

## Opción B: Google Sheets (gratis)

1. Crea una hoja de cálculo en Google Drive y compártela con el equipo.
2. **Extensiones → Apps Script**, borra lo que haya y pega el contenido de `google-apps-script.gs`. Guarda.
3. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Acceso: **Cualquier usuario**. Autoriza los permisos.
4. Copia la URL que termina en `/exec`.
5. En `Notificador de Incidentes.html` → ⚙️ → **Google Sheets**, pega la URL, **Probar conexión** y **Guardar**.

La hoja **Incidentes** se crea sola. Se puede descargar como Excel desde *Archivo → Descargar → Microsoft Excel*.

---

## Notas
- La hora es la del reloj del equipo que reporta. En Google Sheets también queda la columna "Recibido en servidor" como respaldo.
- **Exportar Excel** descarga un `.xlsx` con el día, todo el histórico y un resumen diario por aplicativo, aunque no haya conexión configurada.
- Solo se pueden borrar desde el HTML los incidentes que aún no llegaron al Excel. Los que ya están en el Excel se corrigen en el Excel.
- Cada persona del equipo abre su propia copia de `Notificador de Incidentes.html` (puede estar en la carpeta compartida) y configura las mismas URL.
