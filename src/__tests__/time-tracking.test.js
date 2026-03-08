import {
  addTimeEntry,
  deleteTimeEntry,
  getTimeEntries,
  updateTimeEntry,
} from '../services/time-tracking';

describe('time-tracking service', () => {
  beforeEach(() => {
    getTimeEntries().splice(0, getTimeEntries().length);
  });

  test('addTimeEntry agrega entradas y getTimeEntries las devuelve', () => {
    const entry = { userId: 'u1', horas: 2 };
    addTimeEntry(entry);

    expect(getTimeEntries()).toHaveLength(1);
    expect(getTimeEntries()[0]).toEqual(entry);
  });

  test('updateTimeEntry actualiza entrada existente', () => {
    addTimeEntry({ userId: 'u1', horas: 2 });
    updateTimeEntry(0, { userId: 'u1', horas: 3 });

    expect(getTimeEntries()[0]).toEqual({ userId: 'u1', horas: 3 });
  });

  test('updateTimeEntry ignora indice invalido', () => {
    addTimeEntry({ userId: 'u1', horas: 2 });
    updateTimeEntry(99, { userId: 'u1', horas: 5 });

    expect(getTimeEntries()[0]).toEqual({ userId: 'u1', horas: 2 });
  });

  test('deleteTimeEntry elimina entrada por indice', () => {
    addTimeEntry({ id: 1 });
    addTimeEntry({ id: 2 });

    deleteTimeEntry(0);

    expect(getTimeEntries()).toEqual([{ id: 2 }]);
  });

  test('deleteTimeEntry ignora indice fuera de rango', () => {
    addTimeEntry({ id: 1 });
    deleteTimeEntry(5);

    expect(getTimeEntries()).toEqual([{ id: 1 }]);
  });
});
