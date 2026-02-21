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
            // Instruction: oracleOverrides[oracleId] ?? instanceOverride ?? baseImageUri
            const effectiveUri = (card.oracleId ? this.oracleOverrides[card.oracleId] : null)
                ?? this.overrides[key]
                ?? card.imageUri;

            snapshotCards[key] = {
                ...card,
                imageUri: effectiveUri
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
        // Note: oracleOverrides are NOT cleared on match reset as they are persistent "Skin" choices.
        this.updateId++;
        this.emit('update', this.getSnapshot());
    }

    public setOracleOverride(oracleId: string, uri: string | null) {
        if (uri) {
            this.oracleOverrides[oracleId] = uri;
        } else {
            delete this.oracleOverrides[oracleId];
        }
        this.updateId++;
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

    public touch() {
        this.updateId++;
        this.emit('update', this.getSnapshot());
    }
}

