export type MateriaId = 'psicologia' | 'economia';

export type Tema = { id: string; titulo: string; orden: number };
export type PuntoClave = { id: string; temaId: string; texto: string; fuente: string };
export type Pildora = { id: string; temaId: string; frente: string; reverso: string; fuente: string };
export type Pregunta = {
  id: string;
  temaId: string;
  enunciado: string;
  opciones: [string, string, string, string];
  correcta: 0 | 1 | 2 | 3;
  explicacion: string;
  nivel: 'recordar' | 'comprender' | 'aplicar';
  fuente: string;
};

export type Materia = {
  id: MateriaId | 'epica' | 'latin' | 'filosofia';
  nombre: string;
  temas: Tema[];
  puntosClave: PuntoClave[];
  pildoras: Pildora[];
  preguntas: Pregunta[];
};

export type Modo = 'practica' | 'examen' | 'repaso';

export type Intento = { fecha: string; modo: Modo; correctas: number; total: number };

/** Saved progress for one subject. `errores` maps question id → consecutive correct answers since last miss. */
export type Progreso = {
  pildoras: Record<string, 'se' | 'repasar'>;
  errores: Record<string, number>;
  historial: Intento[];
};
