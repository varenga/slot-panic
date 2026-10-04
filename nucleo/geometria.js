/*
 * Slot Panic — geometría pura. Ni estado, ni dibujo, ni DOM.
 */

export function distancia(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(maximo, valor));
}

/** Ángulo en (-π, π]. */
export function normalizarAngulo(angulo) {
  return Math.atan2(Math.sin(angulo), Math.cos(angulo));
}

/** Punto más cercano a `p` del segmento a→b, con su parámetro `t` en [0, 1]. */
export function proyectarEnSegmento(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const largo2 = abx * abx + aby * aby;
  const t = largo2 > 0 ? limitar(((p.x - a.x) * abx + (p.y - a.y) * aby) / largo2, 0, 1) : 0;
  return { x: a.x + abx * t, y: a.y + aby * t, t };
}

/*
 * Redondea un polígono cerrado: cada vértice `{ x, y, radio }` se sustituye por
 * un arco de ese radio tangente a sus dos lados, muestreado cada `paso` px.
 * Devuelve los puntos del eje con el radio de curvatura de cada uno (Infinity
 * en las rectas), que es lo que el piloto automático necesita para frenar, y
 * hacia qué lado gira (`curva`, el lado del centro según la normal
 * `(-sen, cos)` del rumbo; 0 en las rectas).
 */
export function redondearPoligono(vertices, paso) {
  const n = vertices.length;
  const tramos = vertices.map((v, i) => {
    const anterior = vertices[(i - 1 + n) % n];
    const siguiente = vertices[(i + 1) % n];
    const entrada = unitario(anterior, v);
    const salida = unitario(v, siguiente);
    const giro = normalizarAngulo(Math.atan2(salida.y, salida.x) - Math.atan2(entrada.y, entrada.x));
    const tangente = v.radio * Math.tan(Math.abs(giro) / 2);
    const inicio = { x: v.x - entrada.x * tangente, y: v.y - entrada.y * tangente };
    // El centro queda a un lado u otro según el sentido del giro.
    const lado = Math.sign(giro);
    const centro = { x: inicio.x - entrada.y * v.radio * lado, y: inicio.y + entrada.x * v.radio * lado };
    return { inicio, centro, giro, radio: v.radio, salida: { x: v.x + salida.x * tangente, y: v.y + salida.y * tangente } };
  });

  const puntos = [];
  tramos.forEach((tramo, i) => {
    // El arco del vértice...
    const angulo0 = Math.atan2(tramo.inicio.y - tramo.centro.y, tramo.inicio.x - tramo.centro.x);
    const pasosArco = Math.max(2, Math.ceil(Math.abs(tramo.giro) * tramo.radio / paso));
    for (let k = 0; k < pasosArco; k++) {
      const a = angulo0 + tramo.giro * k / pasosArco;
      puntos.push({
        x: tramo.centro.x + Math.cos(a) * tramo.radio, y: tramo.centro.y + Math.sin(a) * tramo.radio,
        radio: tramo.radio, curva: Math.sign(tramo.giro)
      });
    }
    // ...y la recta hasta el arco siguiente.
    const desde = tramo.salida, hasta = tramos[(i + 1) % n].inicio;
    const pasosRecta = Math.max(1, Math.ceil(distancia(desde, hasta) / paso));
    for (let k = 0; k < pasosRecta; k++) {
      puntos.push({ x: desde.x + (hasta.x - desde.x) * k / pasosRecta, y: desde.y + (hasta.y - desde.y) * k / pasosRecta, radio: Infinity, curva: 0 });
    }
  });
  return puntos;
}

function unitario(a, b) {
  const d = distancia(a, b);
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

