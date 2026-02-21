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

// 17Lands Draft Stats
export interface DraftCardStats {
    source: '17lands';
    format?: string;
    cohort?: string;
    metrics: {
        seen: number;
        picked: number;
        gp: number;
        gpPct: number;      // 0..1
        gpWr: number;       // 0..1
        alsa: number;
        ata: number;
        oh: number;
        ohWr: number;
        gd: number;
        gdWr: number;
        gih: number;
        gihWr: number;
        gns: number;
        gnsWr: number;
        iihPp: number;      // numeric (e.g., 1.1)
    };
    color?: string;
    rarity?: string;
    name: string;
    oracleId?: string;
    ambiguous?: boolean; // Flag for duplicate names
}

// Store
export interface CardMetadata {
    name: string;
    scryfallId?: string;
    oracleId?: string;
    imageUri?: string;
    printUris?: string[];
    draftStats?: DraftCardStats;
}

export interface StoreSnapshot {
    zones: {
        hand: IdentityKey[];
        battlefield: IdentityKey[];
    };
    cards: Record<IdentityKey, CardMetadata>;
    updateId: number;
}

