# Centro de Impresión Abareyesmagos — Prototipo 0.2

## Qué contiene
- Portal de cliente con diseño adaptable a celular y computadora.
- Selección local de PDF, JPG y PNG (límite de demostración: 15 MB).
- Opciones de blanco y negro / color, carta / oficio, páginas y copias.
- Estimación de precio con tarifas editables de demostración.
- Registro de solicitudes con folio.
- Panel local para revisar solicitudes, cambiar estados, eliminar registros y exportar CSV.
- Persistencia de metadatos y tarifas en `localStorage`.

## Importante: todavía NO es un servicio de impresión en producción
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
