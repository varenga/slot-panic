// PNYK — transporte del juego con otras personas, con el servidor de salas común
// (https://salas.pnyk.es, repositorio C:\html\salas). Vive en pnyk/comun/ y llega a
// cada juego como vendor/pnyk/net.js con tools/propagar.js: no se edita en el juego.
//
// Solo el transporte: abre el WebSocket con el servidor de salas, crea o se une a
// una sala y pasa mensajes. El juego no ve el WebSocket ni el protocolo con el
// servidor; ve `net` y nada más. Las pantallas de sala y lo que se dicen los
// jugadores durante la partida son del juego.
//
// Es un script clásico, sin módulos: se carga antes que el juego y comparte su
// ámbito global. Como vendor/ no se sirve, el generador de cada juego lo copia a
// la raíz del sitio. No abre ninguna conexión al cargar: jugar solo, sin red o
// con file:// no pasa por aquí.
//
// Uso:
//   net.juego   = 'orbit-panic';          // el slug de pnyk, dado de alta en salas/juegos.js
//   net.version = 1;                      // la de los mensajes de partida del juego
//   net.alEntrar  = (codigo, rol, puesto) => {}  // 'anfitrion' (puesto 0) o 'invitado'
//   net.alCompa   = (puesto) => {}        // un invitado ha entrado (lo oye el anfitrión)
//   net.alSale    = (puesto) => {}        // un invitado se fue de una sala de más de dos
//   net.alRecibir = (datos, de) => {}     // lo que otro mandó con net.enviar(); de, su puesto
//   net.alCerrar  = (motivo) => {}        // ver NET_MOTIVOS
//   net.crear();  net.unir('AB3K');  net.enviar({...});  net.salir();
//
// Salas de más de dos (desde comun 1.4.0): net.crear(4) admite hasta cuatro. El
// anfitrión es el puesto 0 y cada invitado sabe el suyo (net.puesto). Los invitados
// solo hablan con el anfitrión; el anfitrión, con todos, o con uno:
// net.enviar(datos, puesto). Sin número, la sala es de dos, la de siempre.

// La versión de lo que se dicen este cliente y el servidor (SERVIDOR en
// salas/salas.js). La del juego es net.version: el servidor compara la de los dos
// jugadores de una sala y, si no coinciden, cierra con 'version'.
const NET_SERVIDOR = 1;

// El código de sala, igual que en salas/salas.js: 4 caracteres sin los que se
// confunden (0/O, 1/I/L). El selector del código solo debe dejar escribir estos.
const NET_ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const NET_CODIGO_LEN = 4;

// Lo que puede llegar a alCerrar. Los del servidor y los del propio transporte:
//   archivo    abierto con file://: no hay origen que el servidor admita
//   sin-red    no se llegó a conectar (sin red, servidor caído, origen rechazado)
//   corte      la conexión se cayó a mitad
//   no-existe  el código no corresponde a ninguna sala de este juego
//   llena      la sala ya está completa
//   intentos   demasiadas salas creadas o códigos fallados seguidos
//   lleno      el servidor no admite más salas
//   version    los dos jugadores, o el juego y el servidor, no hablan lo mismo
//   caducada   diez minutos sin invitado
//   compa      el otro jugador se fue (en una sala de más de dos, el anfitrión)
//   fin        el otro jugador terminó la partida
const NET_MOTIVOS = ['archivo', 'sin-red', 'corte', 'no-existe', 'llena', 'intentos', 'lleno',
  'version', 'caducada', 'compa', 'fin'];

// Mala red simulada, para probar en local: ?lag=120 retrasa 120 ms cada mensaje,
// de ida y de vuelta, y ?jitter=40 le suma hasta 40 ms al azar. El orden se
// respeta, como en el TCP de verdad: un mensaje retrasado retiene a los siguientes.
const NET_PARAMS = new URLSearchParams(location.search);
const NET_LAG = Math.max(0, Number(NET_PARAMS.get('lag')) || 0);
const NET_JITTER = Math.max(0, Number(NET_PARAMS.get('jitter')) || 0);

// Sin respuesta del servidor en este tiempo se da por no conectado. Passenger
// puede tardar en despertar la aplicación tras un rato parada.
const NET_ESPERA_MS = 10000;

// En producción, salas.pnyk.es. Con la web servida en http:// —en local, o desde
// otro dispositivo de la red de casa— el servidor es el de desarrollo,
// `npm run dev` en salas/, en el mismo host y el puerto 3001. La app de las
// tiendas sirve desde https://localhost o capacitor://localhost y va a producción.
function netUrl(juego, version) {
  if (location.protocol === 'file:') return null;
  const base = location.protocol === 'http:'
    ? `ws://${location.hostname}:3001/ws`
    : 'wss://salas.pnyk.es/ws';
  return `${base}?juego=${encodeURIComponent(juego)}&v=${version}&s=${NET_SERVIDOR}`;
}

const net = {
  juego: null,
  version: 1,

  rol: null,            // 'anfitrion' | 'invitado' | null
  codigo: null,
  puesto: null,         // 0 el anfitrión; 1 a 3 los invitados
  emparejado: false,    // hay alguien más en la sala

  alEntrar: null,
  alCompa: null,
  alSale: null,
  alRecibir: null,
  alCerrar: null,

  _otros: null,         // los puestos de los invitados, para el anfitrión

  _ws: null,
  _hola: false,
  _espera: 0,
  _salidaAt: 0,
  _entradaAt: 0,

  // Sin max (o con 2), el mensaje de siempre: así una sala de dos es igual con
  // cualquier versión del servidor.
  crear(max) { this._abrir(max > 2 ? { t: 'crear', max } : { t: 'crear' }); },
  unir(codigo) { this._abrir({ t: 'unir', codigo: String(codigo).toUpperCase() }); },

  // `para`, solo el anfitrión de una sala de más de dos: el puesto que lo recibe.
  // El servidor lo lee al principio del texto sin parsear: va justo detrás de t.
  enviar(datos, para) {
    const ws = this._ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || !this.emparejado) return;
    const texto = JSON.stringify(para == null ? { t: 'm', d: datos } : { t: 'm', para, d: datos });
    this._retrasar('_salidaAt', () => {
      if (ws === this._ws && ws.readyState === WebSocket.OPEN) ws.send(texto);
    });
  },

  // Sin ?lag ni ?jitter, en el acto.
  _retrasar(cola, fn) {
    if (!NET_LAG && !NET_JITTER) { fn(); return; }
    const ahora = performance.now();
    const at = Math.max(this[cola], ahora + NET_LAG + Math.random() * NET_JITTER);
    this[cola] = at;
    setTimeout(fn, at - ahora);
  },

  // Salir por voluntad propia: libera la sala en el servidor y no avisa a
  // alCerrar, porque quien sale ya sabe por qué.
  salir() {
    const ws = this._ws;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'fin' }));
    this._terminar(null);
  },

  _abrir(primero) {
    // Un juego que no se presenta es un fallo de quien lo integra, no de la red.
    if (!this.juego) throw new Error('net.js: falta net.juego');
    if (this._ws) this.salir();
    const url = netUrl(this.juego, this.version);
    if (!url) { this._avisar('archivo'); return; }
    let ws;
    try { ws = new WebSocket(url); } catch (e) { this._avisar('sin-red'); return; }
    this._ws = ws;
    this._hola = false;
    this._espera = setTimeout(() => this._terminar('sin-red'), NET_ESPERA_MS);

    ws.onmessage = (ev) => {
      if (ws !== this._ws) return;
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.t === 'm') {
        // En una sala de dos no viene de quién: es el otro.
        const de = Number.isInteger(msg.de) ? msg.de : (this.rol === 'anfitrion' ? 1 : 0);
        this._retrasar('_entradaAt', () => {
          if (ws === this._ws && this.alRecibir) this.alRecibir(msg.d, de);
        });
        return;
      }
      if (msg.t === 'hola') {
        this._hola = true;
        clearTimeout(this._espera);
        ws.send(JSON.stringify(primero));
      } else if (msg.t === 'sala') {
        this.rol = msg.rol;
        this.codigo = msg.codigo;
        this.puesto = Number.isInteger(msg.puesto) ? msg.puesto : (msg.rol === 'anfitrion' ? 0 : 1);
        this._otros = new Set();
        this.emparejado = msg.rol === 'invitado';
        if (this.alEntrar) this.alEntrar(msg.codigo, msg.rol, this.puesto);
      } else if (msg.t === 'compa') {
        const puesto = Number.isInteger(msg.puesto) ? msg.puesto : 1;
        this._otros.add(puesto);
        this.emparejado = true;
        if (this.alCompa) this.alCompa(puesto);
      } else if (msg.t === 'sale') {
        this._otros.delete(msg.puesto);
        this.emparejado = this._otros.size > 0;
        if (this.alSale) this.alSale(msg.puesto);
      } else if (msg.t === 'cierre') {
        this._terminar(NET_MOTIVOS.includes(msg.motivo) ? msg.motivo : 'corte');
      }
    };
    // Un cierre sin 'cierre' delante: antes de saludar es que no se pudo
    // conectar (el navegador no dice si fue la red, el servidor o el origen).
    ws.onclose = () => {
      if (ws === this._ws) this._terminar(this._hola ? 'corte' : 'sin-red');
    };
    ws.onerror = () => { /* llega también onclose */ };
  },

  _terminar(motivo) {
    const ws = this._ws;
    clearTimeout(this._espera);
    this._ws = null;
    this.rol = null;
    this.codigo = null;
    this.puesto = null;
    this._otros = null;
    this.emparejado = false;
    if (ws) {
      ws.onmessage = ws.onclose = ws.onerror = null;
      try { ws.close(1000); } catch (e) { /* ya cerrado */ }
    }
    if (motivo) this._avisar(motivo);
  },

  _avisar(motivo) {
    if (this.alCerrar) this.alCerrar(motivo);
  },
};
