/** Relógio injetável: os testes o controlam para vencer sessões e esperas sem esperar de verdade. */
export abstract class Clock {
  abstract now(): number;
}

export class SystemClock extends Clock {
  now() {
    return Date.now();
  }
}
