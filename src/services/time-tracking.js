// Este archivo contiene funciones para gestionar el seguimiento del tiempo, incluyendo la creación y actualización de entradas de tiempo.

const timeEntries = [];

// Función para agregar una nueva entrada de tiempo
export function addTimeEntry(entry) {
    timeEntries.push(entry);
}

// Función para obtener todas las entradas de tiempo
export function getTimeEntries() {
    return timeEntries;
}

// Función para actualizar una entrada de tiempo
export function updateTimeEntry(index, updatedEntry) {
    if (index >= 0 && index < timeEntries.length) {
        timeEntries[index] = updatedEntry;
    }
}

// Función para eliminar una entrada de tiempo
export function deleteTimeEntry(index) {
    if (index >= 0 && index < timeEntries.length) {
        timeEntries.splice(index, 1);
    }
}