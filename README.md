# Colonia

La app de la colonia de verano: misiones con foto, figuritas, el altarcito playero de cada uno (con kiosco) y la foto del 8/12 que armamos entre todos.

- **Cómo se usa:** es una web que se instala en el celu. En iPhone, desde Safari: Compartir → Agregar a inicio. En Android, desde Chrome: ⋮ → Instalar app.
- **Quién sos:** cada celu elige una vez quién es y lo recuerda.
- **Datos:** viven en Supabase (tablas `jugadores`, `figuritas`, `regalos` y el bucket `figuritas`). Este repo no tiene datos ni fotos, solo la app. El esquema está en `supabase/schema.sql`.
- **Modo demo:** agregando `?demo` a la dirección, todo queda en el dispositivo y los demás tienen progreso de ejemplo. Con `?probar` aparece el panel para probar el cielo.

Hecha a mano, sin build: `index.html`, `css/app.css` y los scripts de `js/`.
