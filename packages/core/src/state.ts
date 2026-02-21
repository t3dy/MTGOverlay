import { EventEmitter } from 'node:events';
import { StoreSnapshot, IdentityKey, CardMetadata } from '@mtga-overlay/shared';

export class GameStateStore extends EventEmitter {
    private zones: {
        hand: IdentityKey[];
        battlefield: IdentityKey[];
    } = {
            hand: [],
            battlefield: []
        };

    private cards: Record<IdentityKey, CardMetadata> = {};
    private overrides: Record<IdentityKey, string> = {};
    private oracleOverrides: Record<string, string> = {};
    private updateId: number = 0;

    public getSnapshot(): StoreSnapshot {
        const snapshotCards: Record<IdentityKey, CardMetadata> = {};
        for (const [key, card] of Object.entries(this.cards)) {
            snapshotCards[key] = {
                ...card,
                imageUri: this.getEffectiveImageUri(key) || card.imageUri
            };
        }

        return {
            zones: {
                hand: [...this.zones.hand],
                battlefield: [...this.zones.battlefield]
            },
            cards: snapshotCards,
            updateId: this.updateId
        };
    }

    public reset() {
        this.zones = { hand: [], battlefield: [] };
        this.overrides = {};
        // Note: oracleOverrides are persistent and NOT cleared on match reset.
        this.updateId++;
        this.emit('update', this.getSnapshot());
    }

    public updateZones(newZones: Partial<typeof this.zones>) {
        if (newZones.hand) this.zones.hand = newZones.hand;
        if (newZones.battlefield) this.zones.battlefield = newZones.battlefield;
        this.updateId++;
        this.emit('update', this.getSnapshot());
    }

    public upsertCard(key: IdentityKey, metadata: CardMetadata) {
        if (!this.cards[key]) {
            this.cards[key] = metadata;
        }
    }

    public patchCard(key: IdentityKey, patch: Partial<CardMetadata>) {
        if (this.cards[key]) {
            this.cards[key] = { ...this.cards[key], ...patch };
        }
    }

    public setOracleOverride(oracleId: string, uri: string | null) {
        if (uri) {
            this.oracleOverrides[oracleId] = uri;
        } else {
            delete this.oracleOverrides[oracleId];
        }
        this.updateId++;
    }

    public setArtOverride(key: IdentityKey, uri: string | null) {
        if (uri) {
            this.overrides[key] = uri;
        } else {
            delete this.overrides[key];
        }
        this.updateId++; // Trigger updateId change for overrides too
    }

    public getCard(key: IdentityKey): CardMetadata | undefined {
        return this.cards[key];
    }

    public getEffectiveImageUri(key: IdentityKey): string | undefined {
        const card = this.cards[key];
        if (!card) return undefined;
        return (card.oracleId ? this.oracleOverrides[card.oracleId] : null)
            ?? this.overrides[key]
            ?? card.imageUri;
    }

    public touch() {
        this.updateId++;
        this.emit('update', this.getSnapshot());
    }
}

