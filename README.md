# Mis gastos — instrucciones fáciles

Esta carpeta contiene una aplicación de gastos que funciona como PWA y se puede instalar en un iPhone.

## 1. Probarla en Windows

### Opción recomendada: Visual Studio Code + Live Server

1. Instala Visual Studio Code.
2. Abre esta carpeta desde `Archivo > Abrir carpeta`.
3. En Visual Studio Code, abre la sección `Extensiones`.
4. Busca e instala `Live Server`, de Ritwick Dey.
5. Haz clic derecho sobre `index.html`.
6. Pulsa `Open with Live Server`.
7. Se abrirá la aplicación en el navegador.

También puedes abrir `index.html` con doble clic, pero el funcionamiento sin conexión solo se activa cuando se usa un servidor web.

## 2. Publicarla gratis con GitHub Pages

1. Crea una cuenta en GitHub si todavía no tienes.
2. Pulsa `New repository`.
3. Pon como nombre `gastos-eva`.
4. Marca `Public`.
5. Pulsa `Create repository`.
6. Dentro del repositorio, pulsa `Add file > Upload files`.
7. Arrastra TODOS los archivos y la carpeta `icons`.
8. Pulsa `Commit changes`.
9. Entra en `Settings > Pages`.
10. En `Build and deployment`, selecciona:
    - Source: `Deploy from a branch`
    - Branch: `main`
    - Folder: `/(root)`
11. Pulsa `Save`.

GitHub mostrará una dirección parecida a:

`https://TU-USUARIO.github.io/gastos-eva/`

## 3. Instalarla en el iPhone

1. Abre la dirección anterior con Safari.
2. Pulsa el botón Compartir.
3. Pulsa `Añadir a pantalla de inicio`.
4. Activa `Abrir como app`, si aparece.
5. Pulsa `Añadir`.

## Importante sobre los datos

- Los gastos se guardan en el navegador del dispositivo.
- No se suben a GitHub.
- El código de la app sí será público si usas un repositorio público.
- Utiliza la pantalla `Copia` para exportar periódicamente tus gastos.
- Si borras los datos de Safari o eliminas la app web, podrías perder los gastos guardados si no tienes copia.

## Archivos principales

- `index.html`: estructura de las pantallas.
- `style.css`: diseño.
- `app.js`: funcionamiento y almacenamiento.
- `manifest.webmanifest`: información para instalar la PWA.
- `service-worker.js`: funcionamiento sin conexión.
- `icons/`: iconos de la aplicación.

## Descargar el resumen para Excel

1. Elige el mes en la pantalla `Resumen`.
2. Entra en la pestaña `Copia`.
3. Pulsa `Descargar resumen para Excel`.
4. Se descargará un archivo `.csv` con el resumen por categorías y el detalle del mes.
5. El archivo se abre directamente con Microsoft Excel.

El formato CSV evita instalar librerías adicionales y mantiene la aplicación sencilla y privada.
