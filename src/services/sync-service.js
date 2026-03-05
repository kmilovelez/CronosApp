// sync-service.js

class SyncService {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
    }

    async syncData(data) {
        try {
            const response = await fetch(`${this.apiUrl}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error syncing data:', error);
            throw error;
        }
    }

    async fetchData() {
        try {
            const response = await fetch(`${this.apiUrl}/data`);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }
}

export default new SyncService('https://api.example.com');