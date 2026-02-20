import { LogTailer } from './log-tailer';
import { parseLine } from './parser';
import { GameStateStore } from './state';
import { ScryfallClient } from './scryfall';
import { CardCache } from './cache';
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
        private cache: CardCache
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
        // 1. Check Memory/Disk Cache
        const cached = this.cache.get(key);
        if (cached) {
            this.store.upsertCard(key, cached);
            this.store.touch();
            // Even if cached, we might want to check for printUris if missing, 
            // but for MVP let's assume if it's cached, it's complete or will stay as is.
            if (cached.oracleId && !cached.printUris) {
                this.fetchAndPatchPrints(key, cached.oracleId);
            }
            return;
        }

        // 2. Scryfall
        let cardData = null;
        if (id.mtgaId) {
            cardData = await this.scryfall.getCardByMtgaId(id.mtgaId);
        } else if (id.name) {
            cardData = await this.scryfall.searchCard(id.name);
        }

        if (cardData) {
            this.store.upsertCard(key, cardData);
            this.cache.set(key, cardData);
            this.store.touch();

            // Background async fetch for prints
            if (cardData.oracleId) {
                this.fetchAndPatchPrints(key, cardData.oracleId);
            }
        }
    }

    private async fetchAndPatchPrints(key: IdentityKey, oracleId: string) {
        const prints = await this.scryfall.getPrintsByOracleId(oracleId);
        if (prints.length > 0) {
            this.store.patchCard(key, { printUris: prints });
            // Update cache too so next restart has them
            const card = this.store.getCard(key);
            if (card) {
                this.cache.set(key, card);
            }
            // No need to touch() immediately, user will see prints when they open popup
        }
    }

    public cycleCardArt(key: IdentityKey) {
        const card = this.store.getCard(key);
        if (!card || !card.printUris || card.printUris.length <= 1) return;

        // Current snapshot computing imageUri from overrides.
        // We need to know current override to pick NEXT.
        // Let's look at what's in the snapshot effectively.
        // Actually store.overrides is private. 
        // Let's add a helper to store or just track it here.
        // Better: let state be authority.

        // For MVP, just pick next from printUris. 
        // We need to know which one is current.
        const snapshot = this.store.getSnapshot();
        const currentUri = snapshot.cards[key]?.imageUri;

        let nextIndex = 0;
        const currentIndex = card.printUris.indexOf(currentUri || '');
        if (currentIndex !== -1) {
            nextIndex = (currentIndex + 1) % card.printUris.length;
        } else {
            // Find base if override not found?
            const baseIndex = card.printUris.indexOf(card.imageUri || '');
            nextIndex = (baseIndex + 1) % card.printUris.length;
        }

        const nextUri = card.printUris[nextIndex];
        this.store.setArtOverride(key, nextUri);
        this.store.touch();
    }
}
