// notification-service.js

class NotificationService {
    constructor() {
        if (!("Notification" in window)) {
            console.error("Este navegador no soporta notificaciones.");
        }
    }

    requestPermission() {
        return Notification.requestPermission();
    }

    showNotification(title, options) {
        if (Notification.permission === "granted") {
            new Notification(title, options);
        } else if (Notification.permission !== "denied") {
            this.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(title, options);
                }
            });
        }
    }

    notifyTimeTrackingUpdate() {
        this.showNotification("Actualización de seguimiento de tiempo", {
            body: "Se ha actualizado el seguimiento de tiempo.",
            icon: "/path/to/icon.png"
        });
    }

    notifySyncStatus(success) {
        const title = success ? "Sincronización exitosa" : "Error de sincronización";
        const options = {
            body: success ? "Los datos se han sincronizado correctamente." : "Hubo un problema al sincronizar los datos.",
            icon: "/path/to/icon.png"
        };
        this.showNotification(title, options);
    }
}

export default new NotificationService();