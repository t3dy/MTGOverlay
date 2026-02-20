import { Card } from '@mtga-overlay/shared';

const RATE_LIMIT_DELAY = 100; // 100ms between requests

export class ScryfallClient {
    private lastRequestTime: number = 0;

    async getCardByMtgaId(mtgaId: number): Promise<Card | null> {
        await this.throttle();
        try {
            const response = await fetch(`https://api.scryfall.com/cards/arena/${mtgaId}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Scryfall API error: ${response.statusText}`);
            }
            const data = await response.json();
            return this.transform(data);
        } catch (error) {
            console.error('Failed to fetch card from Scryfall:', error);
            return null;
        }
    }

    async searchCard(name: string): Promise<Card | null> {
        await this.throttle();
        try {
            const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
            if (!response.ok) return null;
            const data = await response.json();
            return this.transform(data);
        } catch (error) {
            console.error('Failed to search card:', error);
            return null;
        }
    }

    private async throttle() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }

    private transform(data: any): Card {
        return {
            id: data.id,
            mtgaId: data.arena_id || 0,
            name: data.name,
            set: data.set,
            collectorNumber: data.collector_number,
            imageUri: data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '',
            oracleId: data.oracle_id
        };
    }
}
