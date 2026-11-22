# Centro de Impresión Abareyesmagos — Versión 0.3

## Qué contiene
- Portal de cliente con diseño adaptable a celular y computadora.
- Selección local de PDF, JPG y PNG (límite de demostración: 15 MB).
- Opciones de blanco y negro / color, carta / oficio, páginas y copias.
- Estimación de precio con tarifas editables de demostración.
- Registro de solicitudes con folio.
- Panel local para revisar solicitudes, cambiar estados, eliminar registros y exportar CSV.
- Persistencia de metadatos y tarifas en `localStorage`.

## Cómo funciona ahora (sin costo)
- El cliente llena su solicitud, recibe un folio y se abre **WhatsApp** con el resumen listo para enviarte; ahí adjunta el archivo (o usa «Compartir archivo» en celular).
- Cuenta automáticamente las páginas de los PDF.
- Tú recibes pedido + archivo en tu WhatsApp. El panel (PIN) sirve como bitácora en tu dispositivo.

### Configuración (1 minuto)
1. Abre `config.js` y escribe tu WhatsApp con código de país, ej. `"529831234567"`.
2. Sube los 4 archivos (`index.html`, `styles.css`, `app.js`, `config.js`) a la raíz de GitHub Pages.
3. Para entrar al panel abre `tu-sitio/#admin`, toca Administración y crea tu PIN (el botón queda visible solo en tu dispositivo).

## Límites actuales
El panel guarda datos solo en el dispositivo donde se usa y el PIN es una barrera básica, no seguridad real.
Esta versión es un prototipo de interfaz. No tiene backend, autenticación, almacenamiento privado, sincronización entre teléfonos, notificaciones ni conexión con impresora.
**El archivo seleccionado NO se sube ni se guarda**: solo se registra su nombre y tamaño en el navegador. Los pedidos quedan únicamente en el dispositivo y navegador donde se crean.
El acceso al panel es solo visual y no está protegido. No publiques información real ni uses este prototipo para recibir documentos privados.

## Archivos
- `index.html`: estructura de la aplicación.
- `styles.css`: diseño visual responsive.
- `app.js`: interacciones y datos de demostración.

## Publicación en GitHub Pages
Sube los tres archivos a la raíz del repositorio y configura:
- Source: Deploy from a branch
- Branch: `main`
- Folder: `/ (root)`

## Próxima etapa antes de operar
1. Crear/configurar Firebase independiente del POS.
2. Implementar Authentication para el panel privado.
3. Configurar Firestore y Storage privados con reglas de seguridad probadas.
4. Subir documentos con límites y validación real; definir borrado automático.
5. Configurar tarifas oficiales y cálculo en servidor.
6. Añadir notificaciones y flujo de confirmación/pago.
7. Probar impresión manual desde Android con el modelo exacto de impresora.

## Modo nube con Supabase (gratis): pedidos y archivos sincronizados
1. Crea un proyecto en supabase.com (plan Free).
2. En **Authentication → Users** crea tu usuario (correo + contraseña). En **Authentication → Sign In / Providers** desactiva **Allow new users to sign up**.
3. En **SQL Editor** pega `supabase-setup.sql` (antes cambia `CAMBIA_ESTE_CORREO@ejemplo.com` por tu correo) y ejecuta.
4. En **Project Settings → API** copia la *Project URL* y la clave *anon/publishable* a `config.js` (`supabaseUrl`, `supabaseKey`).
5. Sube todos los archivos. Entra a `tu-sitio/#admin` → Administración → inicia sesión.

Con esto el cliente sube su archivo de forma privada, tú lo ves y lo descargas desde el panel en cualquier dispositivo, y las tarifas que guardes aplican a todos. Si pasas 1 semana sin actividad el plan Free pausa el proyecto: entra al panel de Supabase y reactívalo. Borra pedidos con «Eliminar» para liberar espacio (1 GB gratis).
