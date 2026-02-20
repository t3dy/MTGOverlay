import { EventEmitter } from 'node:events';
import { GameState, Card } from '@mtga-overlay/shared';

export class GameStateStore extends EventEmitter {
    private state: GameState = {
        matchId: null,
        zones: {
            hand: [],
            battlefield: [],
            graveyard: [],
            exile: [],
            library: []
        }
    };

    public getState(): GameState {
        return this.state;
    }

    public reset() {
        this.state = {
            matchId: null,
            zones: {
                hand: [],
                battlefield: [],
                graveyard: [],
                exile: [],
                library: []
            }
        };
        this.emit('update', this.state);
    }

    public updateZone(zoneName: keyof GameState['zones'], cards: Card[]) {
        this.state.zones[zoneName] = cards;
        this.emit('update', this.state);
    }

    public setMatchId(id: string) {
        this.state.matchId = id;
        this.emit('update', this.state);
    }
}
