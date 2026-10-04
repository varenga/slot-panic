/*
 * Slot Panic — los escenarios: el suelo y lo que crece en él.
 *
 * Son cosméticos: no cambian el agarre ni nada que el arnés mida. La calzada,
 * los bordes y los pianos son los mismos en todos (el playtest los dio por
 * buenos); cambia lo de fuera. Datos puros: este módulo no importa nada.
 *
 * `piezas` son pesos: qué proporción del decorado es de cada tipo. `polvo` es
 * el color (sin el alfa final) de lo que levanta el coche al derrapar o al
 * pisar la grava. `grava` y `gravaMotas`, el de la escapatoria: tiene que
 * leerse distinta del suelo y del asfalto en los cuatro.
 */

export const ORDEN_ESCENARIOS = ['verde', 'tierra', 'desierto', 'nieve'];

export const ESCENARIOS = {
  verde: {
    suelo: '#3a6a3f',
    franja: '#3f7144',           // césped segado a franjas
    motas: ['#346139', '#45794a', '#2f5a34'],
    polvo: 'rgba(205, 210, 215, ',
    grava: '#a89d84',
    gravaMotas: ['#958a72', '#bdb299', '#8a7f68'],
    piezas: { arbol: 0.6, arbusto: 0.3, roca: 0.1 },
    color: { arbol: '#24502b', arbolLuz: '#2f6436', arbusto: '#2b5c31', roca: '#8b9088', rocaLuz: '#a4a8a0' }
  },
  tierra: {
    suelo: '#6d5336',
    franja: null,
    motas: ['#5f4830', '#7c6141', '#57422b', '#856a49'],
    polvo: 'rgba(160, 128, 90, ',
    grava: '#a08a68',
    gravaMotas: ['#8c7656', '#b49e7b', '#7f6a4c'],
    piezas: { arbusto: 0.45, arbol: 0.2, roca: 0.35 },
    color: { arbol: '#3f5a2a', arbolLuz: '#4d6b33', arbusto: '#556b33', roca: '#8a7b66', rocaLuz: '#a3927a' }
  },
  desierto: {
    suelo: '#c6a168',
    franja: null,
    motas: ['#b8935b', '#d3b37c', '#ae8a54'],
    polvo: 'rgba(222, 198, 150, ',
    grava: '#a68a62',
    gravaMotas: ['#927752', '#b99d74', '#8a6f4b'],
    piezas: { cactus: 0.4, roca: 0.45, arbusto: 0.15 },
    color: { cactus: '#4e7d44', cactusLuz: '#6a9b5c', arbusto: '#8a8a4e', roca: '#9a8160', rocaLuz: '#b79c78' }
  },
  nieve: {
    suelo: '#dce5ed',
    franja: null,
    motas: ['#cbd7e2', '#eef3f8', '#c3d0dc'],
    polvo: 'rgba(250, 252, 255, ',
    grava: '#a9b2bc',
    gravaMotas: ['#96a0ab', '#bec6ce', '#8a95a1'],
    piezas: { pino: 0.75, roca: 0.25 },
    color: { pino: '#244e3f', pinoLuz: '#2f6150', nieve: '#f4f8fb', roca: '#7b8696', rocaLuz: '#98a2b0' }
  }
};
