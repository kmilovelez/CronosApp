// ui.js - Funciones auxiliares de interfaz de usuario

export function showToast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
}

export function showLoadingSpinner() {
    console.log('Mostrando spinner de carga...');
}

export function hideLoadingSpinner() {
    console.log('Ocultando spinner de carga...');
}