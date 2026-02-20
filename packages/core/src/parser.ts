import { EventEmitter } from 'node:events';

export class ArenaLogParser extends EventEmitter {
    private buffer: string = '';

    constructor() {
        super();
    }

    public parseChunk(chunk: string) {
        this.buffer += chunk;
        const lines = this.buffer.split(/\r?\n/);

        // Keep the last partial line in the buffer
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            this.processLine(line);
        }
    }

    private processLine(line: string) {
        // Look for GRE Message Types
        // Pattern: [UnityCrossThreadLogger] <== Client.SceneChange(Match)
        // Pattern: [UnityCrossThreadLogger] GREConnection.HandleWebSocketMessage( ... )

        try {
            if (line.includes('GREConnection.HandleWebSocketMessage')) {
                // Extract JSON payload
                // This is a simplification; real logs might be more complex
                // We look for the JSON object in the log line
                const jsonMatch = line.match(/({.*})/);
                if (jsonMatch) {
                    const payload = JSON.parse(jsonMatch[1]);
                    this.emit('gre-message', payload);
                }
            } else if (line.includes('Client.SceneChange')) {
                this.emit('scene-change', line);
            }
        } catch (e) {
            // Ignore parse errors to keep stream alive
            // console.error('Failed to parse line:', e);
        }
    }
}
