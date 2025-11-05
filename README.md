# Stencil - Control de Líneas de Producción

Sistema de control y seguimiento de líneas de stencil con registro de tiempos y alarmas.

## 🚀 Acceso

### Red Local
- **Frontend**: `http://<IP_DEL_SERVIDOR>:8565`
- **Backend API**: `http://<IP_DEL_SERVIDOR>:8564/api`

Donde `<IP_DEL_SERVIDOR>` es la IP de la máquina donde está corriendo nginx (ejemplo: `http://192.168.1.100:8565`)

### Localhost
- **Frontend**: `http://localhost:8565`
- **Backend API**: `http://localhost:8564/api`

## 📋 Características

- ⏱️ Control de tiempo de ejecución de 4 líneas de stencil
- 🔔 Alarma automática a las 8 horas con notificación del navegador
- 🔐 Autenticación por gafete de empleado con escaneo
- 📊 Historial completo con paginación (100 registros por página)
- 📥 Exportación a Excel del historial
- 🎨 Interfaz moderna con Tailwind CSS

## 🛠️ Configuración

### Backend (Puerto 8564)

1. Navegar a la carpeta backend:
```bash
cd c:\app\stencil\backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno en `.env`:
```env
PORT=8564
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password

DB_NAME=stencil
CRED_DB_NAME=credenciales
JWT_SECRET=tu_secret
JWT_EXPIRES_IN=8h
```

4. Iniciar el servidor:
```bash
npm start
```

### Frontend (Puerto 8565 con nginx)

1. Navegar a la carpeta frontend:
```bash
cd c:\app\stencil\frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Para desarrollo:
```bash
npm run dev
```

4. Para producción (generar build):
```bash
npm run build
```

Los archivos se generarán en `c:\app\stencil\frontend\dist` y nginx los servirá automáticamente.

## 🔧 Nginx

La configuración de nginx ya está lista en `c:\nginx\conf\nginx.conf`:

```nginx
server {
    listen 8565;
    server_name _;
    
    location / {
        root C:/app/stencil/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8564/api/;
        # ... headers CORS
    }
}
```

Después de hacer cambios en el código, recuerda:
1. Ejecutar `npm run build` en el frontend
2. Reiniciar nginx: `nginx -s reload`

## 📱 Uso

### Iniciar una Línea
1. Ingresa el número de stencil
2. Presiona "Iniciar"
3. Escanea tu gafete (o ingresa tu número de empleado)
4. Ingresa tu contraseña
5. El contador comenzará

### Detener una Línea
1. Presiona "Detener" en la línea activa
2. Escanea tu gafete
3. Ingresa tu contraseña
4. El ciclo se guardará en el historial

### Alarma de 8 Horas
- Cuando una línea alcance las 8 horas:
  - 🔴 La tarjeta se pondrá roja pulsante
  - 🔊 Sonará una alarma
  - 🔔 Recibirás una notificación del navegador (incluso si la pestaña está en segundo plano)

### Ver Historial
1. Click en "Ver Historial"
2. Navega por las páginas (100 registros por página)
3. Exporta a Excel con el botón "Exportar a Excel"

## 🗄️ Base de Datos

### Tabla: `registros`
```sql
CREATE TABLE registros (
  id INT AUTO_INCREMENT PRIMARY KEY,
  linea INT NOT NULL,
  stencil VARCHAR(100),
  fh_i DATETIME NOT NULL,
  fh_d DATETIME,
  usuario VARCHAR(255),
  usuario1 VARCHAR(255)
);
```

- `usuario`: Nombre de quien inicia el ciclo
- `usuario1`: Nombre de quien detiene el ciclo

### Base de datos: `credenciales`
Comparte la tabla `users` con otras aplicaciones para la autenticación.

## 🚀 Scripts Rápidos

Desde `c:\app`:

- **Buildear todos los frontends** (incluyendo stencil):
  ```bash
  build-all-frontends.bat
  ```

- **Iniciar todos los backends** (incluyendo stencil):
  ```bash
  start-all-backends.bat
  ```

## 🔐 Permisos de Notificación

Para recibir notificaciones del navegador cuando se alcancen las 8 horas:
1. La primera vez que accedas, acepta los permisos de notificación
2. Si los rechazaste, puedes cambiarlos en:
   - Chrome: Haz clic en el candado → Configuración del sitio → Notificaciones → Permitir
   - Edge: Haz clic en el candado → Permisos para este sitio → Notificaciones → Permitir

## 📝 Notas

- El sistema normaliza los números de gafete automáticamente (elimina ceros a la izquierda y letras al final)
- Ejemplo: `0179A` → `179`
- Todos los tiempos se registran en hora local (no UTC)
- La aplicación actualiza los estados cada 3 segundos automáticamente