/*
 * Slot Panic — los circuitos. La horquilla, heredada de Race Panic y declarada
 * por vértices, y los de piezas (`nucleo/piezas.js`). El arnés los recorre
 * todos; la portada los ofrece en este orden.
 */

import { PRIMERO } from './primero.js';
import { OCHO } from './ocho.js';
import { NUDO } from './nudo.js';
import { RESBALON } from './resbalon.js';
import { BANERA } from './banera.js';
import { DIAGONAL } from './diagonal.js';
import { OCHO_LARGO } from './ochoLargo.js';
import { JUDIA } from './judia.js';
import { ELE } from './ele.js';

export const CIRCUITOS = [PRIMERO, OCHO, NUDO, RESBALON, BANERA, DIAGONAL];

/*
 * Los de la pista de cuatro carriles: otro modo, con sus circuitos y su
 * campeonato. No son oficiales: no entran en el campeonato de los seis ni
 * tienen récords. Los que no son un ocho se corren en mangas (`nucleo/mangas.js`).
 */
export const CIRCUITOS_CUATRO = [OCHO_LARGO, JUDIA, ELE];
