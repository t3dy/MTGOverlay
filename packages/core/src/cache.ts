import fs from 'node:fs';
import path from 'node:path';
import { Card } from '@mtga-overlay/shared';

export class CardCache {
    private cacheDir: string;
    private memoryCache: Map<string, Card> = new Map();

    constructor(baseDir: string) {
        this.cacheDir = path.join(baseDir, 'cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    get(id: string): Card | undefined {
        if (this.memoryCache.has(id)) {
            return this.memoryCache.get(id);
        }
        const filePath = path.join(this.cacheDir, `${id}.json`);
        if (fs.existsSync(filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                this.memoryCache.set(id, data);
                return data;
            } catch (e) {
                console.error('Failed to read cache file', e);
            }
        }
        return undefined;
    }

    set(card: Card) {
        this.memoryCache.set(card.id, card);
        const filePath = path.join(this.cacheDir, `${card.id}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(card, null, 2));
        } catch (e) {
            console.error('Failed to write cache file', e);
        }
    }
}
