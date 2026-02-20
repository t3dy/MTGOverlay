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
    private updateId: number = 0;

    public getSnapshot(): StoreSnapshot {
        return {
            zones: {
                hand: [...this.zones.hand],
                battlefield: [...this.zones.battlefield]
            },
            cards: { ...this.cards },
            updateId: this.updateId
        };
    }

    public reset() {
        this.zones = { hand: [], battlefield: [] };
        // We might want to keep card cache, but for now reset is hard
        // this.cards = {}; 
        // Actually, keeping resolved cards is better for cache hit rate
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
            // We don't necessarily emit on every card resolve, 
            // the orchestrator will trigger a snapshot update after batch processing.
        }
    }

    public touch() {
        this.updateId++;
        this.emit('update', this.getSnapshot());
    }
}

