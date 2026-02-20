export interface Card {
    id: string; // Scryfall ID
    mtgaId: number;
    name: string;
    set: string;
    collectorNumber: string;
    imageUri: string;
    oracleId: string;
}

export interface GameState {
    matchId: string | null;
    zones: {
        hand: Card[];
        battlefield: Card[];
        graveyard: Card[];
        exile: Card[];
        library: Card[];
    };
}

export type ZoneName = keyof GameState['zones'];
