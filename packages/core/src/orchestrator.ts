import { LogTailer } from './log-tailer';
import { parseLine } from './parser';
import { GameStateStore } from './state';
import { ScryfallClient } from './scryfall';
import { CardCache } from './cache';
import { ArenaCardIdentity, identityKey, IdentityKey } from '@mtga-overlay/shared';

export class GameOrchestrator {
    // Deduplication & Race Protection
    private inFlightIdentities = new Set<IdentityKey>();
    private resolvedIdentities = new Set<IdentityKey>();
    private printsInFlightByOracleId = new Set<string>();

    constructor(
        private tailer: LogTailer,
        private store: GameStateStore,
        private scryfall: ScryfallClient,
        private cache: CardCache
    ) { }

    public start() {
        this.loadPersistentOverrides();
        this.tailer.on('newLine', (line: string) => this.processLine(line));
        this.tailer.start(); // Start tailing if not already
    }

    private loadPersistentOverrides() {
        const overrides = this.cache.loadOverrides();
        for (const [oracleId, uri] of Object.entries(overrides)) {
            this.store.setOracleOverride(oracleId, uri);
        }
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
                this.inFlightIdentities.clear();
                stateChanged = true;
            } else if (event.type === 'GameStateChanged') {
                const handKeys = this.resolveIdentities(event.payload.hand);
                const battlefieldKeys = this.resolveIdentities(event.payload.battlefield);

                this.store.updateZones({
                    hand: handKeys,
                    battlefield: battlefieldKeys
                });
                stateChanged = true;
            }
        }

        // Throttling is now handled in Main Process
        if (stateChanged) {
            this.store.touch();
        }
    }

    private resolveIdentities(identities: ArenaCardIdentity[]): IdentityKey[] {
        const keys: IdentityKey[] = [];

        for (const id of identities) {
            const key = identityKey(id);
            keys.push(key);

            if (!this.resolvedIdentities.has(key) && !this.inFlightIdentities.has(key)) {
                this.resolveCard(key, id);
            }
        }
        return keys;
    }

    private async resolveCard(key: IdentityKey, id: ArenaCardIdentity) {
        // Double check cache before marking in-flight
        const cached = this.cache.get(key);
        if (cached) {
            this.store.upsertCard(key, cached);
            this.resolvedIdentities.add(key);
            this.store.touch();
            if (cached.oracleId && !cached.printUris) {
                this.fetchAndPatchPrints(key, cached.oracleId);
            }
            return;
        }

        this.inFlightIdentities.add(key);
        try {
            let cardData = null;
            if (id.mtgaId) {
                cardData = await this.scryfall.getCardByMtgaId(id.mtgaId);
            } else if (id.name) {
                cardData = await this.scryfall.searchCard(id.name);
            }

            if (cardData) {
                this.store.upsertCard(key, cardData);
                this.cache.set(key, cardData);
                this.resolvedIdentities.add(key);
                this.store.touch();

                if (cardData.oracleId) {
                    this.fetchAndPatchPrints(key, cardData.oracleId);
                }
            }
        } catch (e) {
            console.error(`Failed to resolve card ${key}:`, e);
            // DO NOT add to resolvedIdentities, allowing future retry
        } finally {
            this.inFlightIdentities.delete(key);
        }
    }

    private async fetchAndPatchPrints(key: IdentityKey, oracleId: string) {
        if (this.printsInFlightByOracleId.has(oracleId)) return;
        this.printsInFlightByOracleId.add(oracleId);

        try {
            const prints = await this.scryfall.getPrintsByOracleId(oracleId);
            if (prints.length > 0) {
                this.store.patchCard(key, { printUris: prints });
                const card = this.store.getCard(key);
                if (card) {
                    this.cache.set(key, card);
                }
            }
        } catch (e) {
            console.error(`Failed to fetch prints for ${oracleId}:`, e);
        } finally {
            this.printsInFlightByOracleId.delete(oracleId);
        }
    }

    public cycleCardArt(key: IdentityKey, direction: 'next' | 'prev' = 'next') {
        const card = this.store.getCard(key);
        if (!card || !card.printUris || card.printUris.length <= 1) return;

        const currentUri = this.store.getEffectiveImageUri(key);

        let currentIndex = card.printUris.indexOf(currentUri || '');
        if (currentIndex === -1) {
            currentIndex = card.printUris.indexOf(card.imageUri || '');
        }

        let nextIndex = 0;
        if (direction === 'next') {
            nextIndex = (currentIndex + 1) % card.printUris.length;
        } else {
            nextIndex = (currentIndex - 1 + card.printUris.length) % card.printUris.length;
        }

        const nextUri = card.printUris[nextIndex];
        this.store.setArtOverride(key, nextUri);

        // Sprint 3: Global Oracle Persistence
        if (card.oracleId) {
            this.store.setOracleOverride(card.oracleId, nextUri);
            this.cache.setOverride(card.oracleId, nextUri);
        }

        this.store.touch();
    }

    public resetOracleOverride(key: IdentityKey) {
        const card = this.store.getCard(key);
        if (card && card.oracleId) {
            this.store.setOracleOverride(card.oracleId, null);
            this.cache.setOverride(card.oracleId, null);
            // Also clear instance override so base displays
            this.store.setArtOverride(key, null);
            this.store.touch();
        }
    }
}
