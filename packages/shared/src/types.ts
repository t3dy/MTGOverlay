// Identity
export interface ArenaCardIdentity {
    mtgaId?: number;
    grpId?: number;
    name?: string;
    set?: string;
}

export type IdentityKey = string;

export function identityKey(id: ArenaCardIdentity): IdentityKey {
    // Deterministic key generation
    // Prefer mtgaId, then grpId, then name+set
    if (id.mtgaId) return `mtga:${id.mtgaId}`;
    if (id.grpId) return `grp:${id.grpId}`;
    if (id.name) return `name:${id.name}|${id.set || ''}`;
    return `unknown:${JSON.stringify(id)}`;
}

// Events
export type ArenaEvent =
    | { type: 'GameStateChanged'; payload: { hand: ArenaCardIdentity[]; battlefield: ArenaCardIdentity[]; raw?: any } }
    | { type: 'MatchStarted'; payload: { raw?: any } }
    | { type: 'Unknown'; payload: { line: string } };

// Store
export interface CardMetadata {
    name: string;
    scryfallId?: string;
    oracleId?: string;
    imageUri?: string; // Using imageUri to match existing usage in ScryfallClient, but plan said imagePath
}

export interface StoreSnapshot {
    zones: {
        hand: IdentityKey[];
        battlefield: IdentityKey[];
    };
    cards: Record<IdentityKey, CardMetadata>;
    updateId: number;
}

