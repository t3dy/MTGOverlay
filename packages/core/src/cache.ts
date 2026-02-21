import fs from 'node:fs';
import path from 'node:path';
import { CardMetadata } from '@mtga-overlay/shared';

export class CardCache {
    private cacheDir: string;
    private memoryCache: Map<string, CardMetadata> = new Map();
    private overridesPath: string;

    constructor(baseDir: string) {
        this.cacheDir = path.join(baseDir, 'cache');
        this.overridesPath = path.join(this.cacheDir, 'overrides.json');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    get(id: string): CardMetadata | undefined {
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

    set(id: string, card: CardMetadata) {
        this.memoryCache.set(id, card);
        // Sanitize ID for filename
        const filename = id.replace(/[^a-z0-9]/gi, '_');
        const filePath = path.join(this.cacheDir, `${filename}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(card, null, 2));
        } catch (e) {
            console.error('Failed to write cache file', e);
        }
    }

    public getOverride(oracleId: string): string | undefined {
        const overrides = this.loadOverrides();
        return overrides[oracleId];
    }

    public setOverride(oracleId: string, uri: string | null) {
        const overrides = this.loadOverrides();
        if (uri) {
            overrides[oracleId] = uri;
        } else {
            delete overrides[oracleId];
        }
        this.saveOverrides(overrides);
    }

    public loadOverrides(): Record<string, string> {
        if (fs.existsSync(this.overridesPath)) {
            try {
                return JSON.parse(fs.readFileSync(this.overridesPath, 'utf-8'));
            } catch (e) {
                console.error('Failed to read overrides file', e);
            }
        }
        return {};
    }

    private saveOverrides(overrides: Record<string, string>) {
        const tempPath = `${this.overridesPath}.tmp`;
        try {
            fs.writeFileSync(tempPath, JSON.stringify(overrides, null, 2));
            fs.renameSync(tempPath, this.overridesPath);
        } catch (e) {
            console.error('Failed to save overrides file', e);
            if (fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
            }
        }
    }
}

