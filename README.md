# Cupex

Widget de escritorio para Windows que muestra el consumo de Codex de tu cuenta de ChatGPT. Adaptado de [Cupo](https://github.com/OkazoKoroma/cupo), conservando su licencia MIT. Proyecto no oficial de OpenAI.

## Versión 0.4.0

- Cuota semanal y período principal con porcentajes reales y cuenta regresiva hasta el reinicio.
- Modos de porcentajes: usado, restante o ambos.
- Antigüedad de la lectura visible y botón de actualización manual.
- Conserva la última lectura ante fallos y al reiniciar; muestra una advertencia si está desactualizada y reintenta a los cinco minutos.
- Presupuesto diario personal: **Hoy ≈** estima el consumo observado a partir del incremento de la cuota semanal. No representa un límite oficial ni un conteo exacto de tokens.
- Alertas configurables del presupuesto diario y del período principal, incluido su reinicio después de agotar el límite.
- Alertas semanales con dos umbrales configurables (75% y 90% por defecto) y aviso al 100%, sin duplicados durante la misma semana. Si una lectura cruza varios umbrales, se envía el aviso más relevante.
- Historial local de 30 días, gráfico de siete días, proyecciones y exportación CSV.
- Vistas normal, compacta y completa; tema oscuro/claro, transparencia, escala e idiomas español/inglés.
- Una cuenta activa vinculada a la sesión local de Codex. Al cambiar la cuenta conectada, separa y conserva sus historiales; los anteriores se consultan y exportan desde el selector del historial. Desconectar el widget conserva la sesión de Codex.
- Comprobación manual de nuevas versiones desde `jair1c/Cupex`, con enlace al instalador publicado.

## Requisitos y ejecución

Windows 10/11, Node.js 20 o superior y Codex instalado, con sesión de ChatGPT. No necesita una clave de la API.

```powershell
npm install
npm start
```

También puedes abrir `Abrir widget.bat`. El widget permanece en la bandeja de Windows; elige **Salir** para cerrarlo.

Cupex detecta el ejecutable de Codex Desktop en `%LOCALAPPDATA%\OpenAI\Codex\bin`, o busca `codex.exe` en PATH. Para elegir un ejecutable concreto:

```powershell
$env:CUPEX_CODEX_PATH = 'C:\ruta\codex.exe'
npm start
```

Si ya tienes sesión en Codex, se utiliza automáticamente. Si no, **Iniciar sesión** abre el flujo oficial en tu navegador. Esta ruta está implementada, pero la verificación local se hizo con una sesión existente.

## Datos y limitaciones

El cliente inicia `codex app-server` por stdio, completa el protocolo de inicialización y consulta `account/read` y `account/rateLimits/read`. No crea chats, no ejecuta tareas de IA ni copia tokens o contraseñas. Codex gestiona sus propias credenciales.

Ajustes e historial del widget: `%APPDATA%\Cupex\datos.json`. Se mantienen separados de Cupo y de sus datos de Claude. El modo de prueba usa `datos-prueba.json`.

Las consultas se hacen cada 15 minutos por defecto (configurable entre 5 y 60). La cuenta regresiva se actualiza localmente. Se programa una consulta dos segundos después del próximo reinicio informado, aunque falte tiempo para la consulta periódica. Si el servidor sigue devolviendo el reinicio anterior, se retoma el intervalo habitual sin generar un bucle de consultas.

Esta versión requiere que Codex informe una cuota secundaria semanal (10080 minutos). Si no está disponible o el plan tiene otra estructura, muestra un error en lugar de inventar datos. El período principal utiliza la duración y fecha informadas por Codex. No ofrece desglose por productos; la vista completa indica su ausencia. No consulta varias cuentas simultáneamente ni consumo facturado con una clave API. La identidad se deriva del correo informado por Codex (guardada como SHA-256, sin almacenar el correo); una cuenta sin correo no permite confirmar identidad y muestra un error. Al actualizar desde 0.3.0, los registros sin identidad se conservan como historial anterior, sin adjudicarlos a una cuenta.

El consumo diario comienza en la primera lectura del día, salvo cuando se identifica un reinicio semanal ese mismo día. Puede omitir actividad mientras el widget está cerrado. Las proyecciones suponen un ritmo constante.

## Verificación

```powershell
npm test
npm run verify:ui
npm run verify:features
npm start -- --prueba
```

`verify:features` simula un fallo después de una lectura real y comprueba conservación, recuperación manual, ajustes y el historial anterior. `verify:ui` consulta límites reales, comprueba el renderizado y los paneles y guarda capturas en `artifacts/`. Usa datos de prueba separados en `%APPDATA%\Cupex-verificacion` y no modifica el historial principal. Cierra Cupex antes de ejecutarla.

## Código

- `src/codex.js`: cliente JSON-RPC local, detección del ejecutable y cierre del proceso.
- `src/uso.js`: validación y adaptación de límites de Codex.
- `src/sesion.js`: conexión a la cuenta local e inicio de sesión.
- `src/main.js`: ventanas, bandeja, consultas periódicas y alertas.
- `src/calculo.js`: estimaciones, historial y proyecciones.
- `src/ventanas/`: interfaz HTML/CSS/JavaScript.

Para generar un instalador: `npm run dist` (requiere Codex instalado en el equipo de destino).

## Actualizaciones publicadas

En Ajustes, **Buscar actualización** consulta la última release estable de https://github.com/jair1c/Cupex. No requiere credenciales de GitHub. Si hay una versión nueva, **Abrir versión nueva** abre su instalador (o página de release) en el navegador para instalarlo. No descarga ni ejecuta instaladores automáticamente.

El repositorio necesita releases con etiquetas como `v0.4.0` e instaladores llamados `Instalar-Cupex-0.4.0.exe`. Mientras no haya releases públicos, Cupex indica que aún no hay versiones disponibles.
