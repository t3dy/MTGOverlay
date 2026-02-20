import { describe, it, expect } from 'vitest';
import { parseLine } from '../src/parser';

describe('ArenaLogParser', () => {
    it('should ignore non-GRE lines', () => {
        const events = parseLine('[UnityCrossThreadLogger] Some random log line');
        expect(events).toEqual([]);
    });

    it('should parse Client.SceneChange Match', () => {
        const events = parseLine('[UnityCrossThreadLogger] <== Client.SceneChange(Match)');
        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('MatchStarted');
    });

    it('should parse GRE GameStateMessage', () => {
        const samplePayload = {
            greToClientEvent: {
                greToClientMessages: [
                    {
                        gameStateMessage: {
                            zones: [
                                {
                                    type: 31, // Hand
                                    objectInstanceIds: [101, 102]
                                },
                                {
                                    type: 28, // Battlefield
                                    objectInstanceIds: [201]
                                }
                            ],
                            gameObjects: [
                                { instanceId: 101, cardTitleId: 1001, grpId: 5001 },
                                { instanceId: 102, cardTitleId: 1002, grpId: 5002 },
                                { instanceId: 201, cardTitleId: 1003, grpId: 5003 }
                            ]
                        }
                    }
                ]
            }
        };

        const line = `[UnityCrossThreadLogger] GREConnection.HandleWebSocketMessage(${JSON.stringify(samplePayload)})`;
        const events = parseLine(line);

        expect(events).toHaveLength(1);
        const evt = events[0];
        if (evt.type !== 'GameStateChanged') throw new Error('Wrong event type');

        expect(evt.payload.hand).toHaveLength(2);
        expect(evt.payload.hand[0].mtgaId).toBe(1001);
        expect(evt.payload.battlefield).toHaveLength(1);
        expect(evt.payload.battlefield[0].mtgaId).toBe(1003);
    });

    it('should handle malformed JSON gracefully', () => {
        const line = `[UnityCrossThreadLogger] GREConnection.HandleWebSocketMessage({ broken json )`;
        const events = parseLine(line);
        expect(events).toEqual([]);
    });
});
