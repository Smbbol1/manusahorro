# TODO — UltraEco

Estado: implementación y configuración nativa preparadas; el APK todavía no está compilado.

## 1. Launcher y configuración inicial
- [x] La aplicación debe ser compatible con Android 13 (API 33) o superior.
- [x] El usuario debe poder completar la selección explícita de UltraEco como aplicación de inicio predeterminada mediante el flujo del sistema; la app no debe cambiar silenciosamente el launcher predeterminado.
- [x] El tutorial debe explicar y abrir las pantallas de Ajustes para cada acceso especial que UltraEco realmente utilice, mostrar el estado del acceso y no pedir permisos innecesarios.
- [x] El tutorial debe aclarar que UltraEco no desactiva «Ajustes restringidos» y no necesita que el usuario habilite Accesibilidad para las funciones implementadas.

## 2. Inicio visual, temas y fondo
- [x] La interfaz principal debe ofrecer un tema OLED cuyo fondo sea negro absoluto (`#000000`).
- [x] Debe ofrecer un tema personalizable con un fondo seleccionado por el usuario mediante Android Photo Picker; no debe solicitar `READ_MEDIA_IMAGES` si Photo Picker cubre el caso.
- [x] La preferencia del tema y el fondo escogido deben conservarse localmente para los siguientes inicios.
- [x] La pantalla principal debe mostrar accesos rápidos a las aplicaciones que el usuario haya permitido.

## 3. Lista de aplicaciones permitidas
- [x] El usuario debe poder configurar una lista blanca de hasta diez aplicaciones instaladas y disponibles como accesos del launcher.
- [x] UltraEco debe poder abrir una aplicación de la lista cuando el usuario toque su acceso.
- [x] La lista solo personaliza los accesos de UltraEco: no debe cerrar procesos de otras apps, automatizar «Forzar detención» ni bloquear apps de terceros mediante superposiciones.

## 4. PIN de salida y persistencia local
- [x] El usuario debe poder configurar un PIN numérico de cuatro dígitos.
- [x] El botón de salida desde la interfaz de UltraEco debe solicitar el PIN configurado antes de completar la salida dentro de la app.
- [x] El PIN debe proteger únicamente la salida desde la interfaz de UltraEco; no debe presentarse como bloqueo del sistema operativo ni impedir que el usuario cambie el launcher desde Ajustes.
- [x] El PIN debe guardarse mediante almacenamiento local seguro; lista blanca, tema, fondo y preferencias deben persistir localmente.

## 5. Brillo reversible
- [x] El usuario debe poder activar opcionalmente la reducción de brillo solo después de conceder el acceso especial `WRITE_SETTINGS` en Ajustes.
- [x] Antes del cambio, UltraEco debe conservar el valor previo para restaurarlo explícitamente; no debe cambiar brillo global sin autorización ni ocultar la forma de revertirlo.

## 6. Estadísticas de uso opcionales
- [x] UltraEco ofrece estadísticas de uso solo después de que el usuario conceda el acceso especial correspondiente, para indicar la aplicación utilizada recientemente.
- [x] Las estadísticas no se usan para cerrar aplicaciones, impedir su apertura ni realizar vigilancia en segundo plano no explicada.

## 7. Límites de permisos y controles del sistema
- [x] `POST_NOTIFICATIONS` no se solicita porque no se implementa un servicio en primer plano.
- [x] No se incluye un servicio de Accesibilidad para automatizar el cierre de otras apps, ventanas `SYSTEM_ALERT_WINDOW` para impedir que se muestren otras apps, ni controles que pretendan apagar globalmente las vibraciones del dispositivo.
- [x] Todos los cambios de configuración que afectan al sistema son explícitos, consentidos y reversibles.

## 8. Informe de errores por segmentos
- [x] La app ofrece una opción para generar un reporte diagnóstico local que el usuario puede compartir por chat en varios segmentos.
- [x] El reporte se divide en partes numeradas y permite copiar cada parte individualmente; no se envía automáticamente ni se sube a un servidor.
- [x] El usuario puede añadir una descripción del problema y revisar el contenido de cada segmento antes de copiarlo.

## 9. APK Android
- [x] Preparar la configuración Android necesaria para compilar la aplicación como APK compatible con Android 13 (API 33) o superior.
- [ ] Compartir el archivo APK únicamente después de que el proceso de compilación confirme que el artefacto se generó correctamente.