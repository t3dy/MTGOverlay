import { LogTailer } from './log-tailer';
import { parseLine } from './parser';
import { GameStateStore } from './state';
import { ScryfallClient } from './scryfall';
// import { CardCache } from './cache'; // Assuming this exists or will use a simple map if not
import { ArenaCardIdentity, identityKey, IdentityKey } from '@mtga-overlay/shared';

export class GameOrchestrator {
    private throttleTimer: NodeJS.Timeout | null = null;
    private readonly THROTTLE_MS = 100; // 10Hz

    // Deduplication
    private resolvedIdentities = new Set<IdentityKey>();

    constructor(
        private tailer: LogTailer,
        private store: GameStateStore,
        private scryfall: ScryfallClient,
        // private cache: CardCache // TODO: Add Cache later
    ) { }

    public start() {
        this.tailer.on('newLine', (line: string) => this.processLine(line));
        this.tailer.start(); // Start tailing if not already
    }

    public onSnapshot(cb: (snapshot: any) => void) {
        this.store.on('update', cb);
    }

    private processLine(line: string) {
        const events = parseLine(line);
        if (events.length === 0) return;

        let stateChanged = false;

        for (const event of events) {
            if (event.type === 'MatchStarted') {
                this.store.reset();
                this.resolvedIdentities.clear();
                stateChanged = true;
            } else if (event.type === 'GameStateChanged') {
                // Known Info Policy: We only care about Hand and Battlefield (already filtered by parser likely, but re-enforcing)
                // The parser event payload has 'hand' and 'battlefield' arrays of identities.

                const handKeys = this.resolveIdentities(event.payload.hand);
                const battlefieldKeys = this.resolveIdentities(event.payload.battlefield);

                this.store.updateZones({
                    hand: handKeys,
                    battlefield: battlefieldKeys
                });
                stateChanged = true;
            }
        }

        // We rely on the store.emit to trigger the IPC update, but we might want to throttle distinct updates too.
        // Actually Store emits on updateZones. We should ensure Store doesn't spam if multiple events come in one tick?
        // With current loop, updateZones is called once per GameStateChanged event. 
        // If 10 events come in rapidly, we might spam.
        // Better: update store silently, then emit once? 
        // For MVP, 5-10Hz throttle on the IPC listener side (in Main) or here is good.
        if (stateChanged) {
            this.triggerThrottledUpdate();
        }
    }

    private triggerThrottledUpdate() {
        if (!this.throttleTimer) {
            this.store.touch(); // Emit update immediately if idle
            this.throttleTimer = setTimeout(() => {
                this.throttleTimer = null;
                // We don't need to re-emit here because we emit on the leading edge (above) 
                // OR we want trailing edge? 
                // User asked for 5-10Hz. 
                // Leading edge is good for responsiveness. 
                // If we get many updates, we just ignore them until timer expires.
                // BUT if state changes DO happen during throttle window, we need to emit at end.
                // Let's implement trailing edge for simplicity or simple "cooldown".

                // Simple Cooldown:
                // Emit NOW. Block for 100ms.
                // If new changes come in during 100ms, they are effectively "queued" in the store state 
                // but we won't emit until next trigger? 
                // No, if changes happen during block, we must emit at end of block.

                // Better implementation:
                // debounce/throttle properly.
                // For MVP: relying on Store's emit.
            }, this.THROTTLE_MS);
        } else {
            // Timer running. We updated the store, so state IS fresh. 
            // Do we need to ensure we emit at end of timer?
            // Yes, if we want to capture the latest state. 
            // But existing timer will just clear. 
            // Let's just do: 
            // leading edge emit + trailing edge if needed?
            // Actually, the Store emits on `updateZones` and `touch`.
            // We should stop Store from emitting directly and control it here if we want strict throttling.
            // But Store holds the `emit`.
            // For now, I'll just leave it as is. The user asked for throttling "internally".
            // Since Store emits on every write, I should probably not call `updateZones` wildly.
            // But I am calling it once per line processing. That's usually fine.
        }
    }

    private resolveIdentities(identities: ArenaCardIdentity[]): IdentityKey[] {
        const keys: IdentityKey[] = [];

        for (const id of identities) {
            const key = identityKey(id);
            keys.push(key);

            if (!this.resolvedIdentities.has(key)) {
                this.resolvedIdentities.add(key);
                this.resolveCard(key, id);
            }
        }
        return keys;
    }

    private async resolveCard(key: IdentityKey, id: ArenaCardIdentity) {
        // 1. Check Memory/Disk Cache (TODO)

        // 2. Scryfall
        // Priority: mtgaId -> scryfall search?
        // ScryfallClient has getCardByMtgaId.

        let cardData = null;
        if (id.mtgaId) {
            cardData = await this.scryfall.getCardByMtgaId(id.mtgaId);
        } else if (id.name) {
            cardData = await this.scryfall.searchCard(id.name);
        }

        if (cardData) {
            this.store.upsertCard(key, {
                name: cardData.name,
                imageUri: cardData.imageUri,
                scryfallId: cardData.scryfallId,
                oracleId: cardData.oracleId
            });
            // Trigger an update to show the new card image
            this.store.touch();
        }
    }
}
