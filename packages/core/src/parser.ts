import { ArenaEvent, ArenaCardIdentity } from '@mtga-overlay/shared';

export function parseLine(line: string): ArenaEvent[] {
    const events: ArenaEvent[] = [];

    try {
        if (line.includes('GREConnection.HandleWebSocketMessage')) {
            const jsonMatch = line.match(/({.*})/);
            if (jsonMatch) {
                const payload = JSON.parse(jsonMatch[1]);
                events.push(...parseGreMessage(payload));
            }
        } else if (line.includes('Client.SceneChange')) {
            // Can detect Match Start here if needed
            if (line.includes('Match')) {
                events.push({ type: 'MatchStarted', payload: { raw: line } });
            }
        }
    } catch (e) {
        // Ignore parse errors, maybe emit Unknown if debug needed
        // events.push({ type: 'Unknown', payload: { line } });
    }

    return events;
}

export function parseGreMessage(json: any): ArenaEvent[] {
    const events: ArenaEvent[] = [];

    // Detect GameStateMessage
    // Structure: greToClientEvent -> greToClientMessages -> [ { gameStateMessage: { ... } } ]
    const messages = json?.greToClientEvent?.greToClientMessages;
    if (Array.isArray(messages)) {
        for (const msg of messages) {
            if (msg.gameStateMessage) {
                events.push(parseGameStateMessage(msg.gameStateMessage));
            }
        }
    }

    return events;
}

function parseGameStateMessage(gsm: any): ArenaEvent {
    const hand: ArenaCardIdentity[] = [];
    const battlefield: ArenaCardIdentity[] = [];

    // Identify zones.
    // In GRE, zones are typically in `zones` array or `gameObjects`
    // We look for 'ZoneType_Hand' (usually 31) and 'ZoneType_Battlefield' (usually 28)
    // NOTE: These IDs are constant in MTGA but can change. Using names if available is better, but often they are enum integers.
    // For MVP, we'll try to walk the gameObjects if present, or zones.

    // Assumption: gsm.gameObjects is a list of objects with 'zoneId' and 'grpId'/'instanceId'
    // This is a simplification. Real parsing requires mapping zone IDs.

    // Let's try to find zones in `zones` if sending full state
    if (gsm.zones) {
        for (const zone of gsm.zones) {
            // Zone IDs: Hand=31, Battlefield=28.
            // We can also deduce from visibility or type.
            // For MVP, let's assume valid objects are in these zones.

            // NOTE: This logic is brittle without full Zone ID mapping.
            // We will look for 31 (Hand) and 28 (Battlefield)
            if (zone.type === 31 || zone.name === 'ZoneType_Hand') {
                hand.push(...extractIdentities(zone.objectInstanceIds, gsm));
            } else if (zone.type === 28 || zone.name === 'ZoneType_Battlefield') {
                battlefield.push(...extractIdentities(zone.objectInstanceIds, gsm));
            }
        }
    }

    // Also look in `gameObjects` for updates?
    // Often GS messages contain `gameObjects` which are the actual cards details.

    return {
        type: 'GameStateChanged',
        payload: {
            hand,
            battlefield,
            raw: gsm
        }
    };
}

function extractIdentities(instanceIds: number[], gsm: any): ArenaCardIdentity[] {
    const identities: ArenaCardIdentity[] = [];
    if (!instanceIds || !gsm.gameObjects) return identities;

    for (const id of instanceIds) {
        const obj = gsm.gameObjects.find((o: any) => o.instanceId === id);
        if (obj) {
            identities.push({
                mtgaId: obj.cardTitleId || 0, // cardTitleId is often the resolving ID
                grpId: obj.grpId,
                name: undefined // Name usually not in GRE, need lookups
            });
        }
    }
    return identities;
}

