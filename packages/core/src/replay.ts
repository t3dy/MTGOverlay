// import { LogTailer } from './log-tailer';
import { GameStateStore } from './state';
import { ScryfallClient } from './scryfall';
import { CardCache } from './cache';
import { GameOrchestrator } from './orchestrator';
import fs from 'node:fs';
import path from 'node:path';

// This script simulates the MTGA log by reading a sample file and feeding it to the orchestrator.
export async function replay(logFilePath: string, delayMs: number = 100) {
    console.log(`Starting replay of ${logFilePath}`);

    // Mocks/Instances
    const stateStore = new GameStateStore();
    const scryfall = new ScryfallClient();
    const cache = new CardCache(path.join(process.cwd(), '.temp-cache'));

    // We can't easily mock the tailer without an interface, but we can emit events on it.
    // Let's create a specialized "ReplayTailer" or just mock it.
    const mockTailer = {
        on: (event: string, cb: any) => {
            (mockTailer as any)[`on${event}`] = cb;
        },
        start: () => { },
        stop: () => { },
        emitLine: (line: string) => {
            if ((mockTailer as any).onnewLine) (mockTailer as any).onnewLine(line);
        }
    } as any;

    const orchestrator = new GameOrchestrator(mockTailer, stateStore, scryfall, cache);

    orchestrator.onSnapshot((snapshot) => {
        console.log(`Snapshot Update [ID: ${snapshot.updateId}]:`);
        console.log(`  Hand: ${snapshot.zones.hand.length} cards`);
        console.log(`  Battlefield: ${snapshot.zones.battlefield.length} cards`);
        // For debug: console.log(JSON.stringify(snapshot.zones, null, 2));
    });

    orchestrator.start();

    const content = fs.readFileSync(logFilePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.trim()) {
            mockTailer.emitLine(line);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log('Replay finished.');
}

if (require.main === module) {
    const file = process.argv[2];
    if (!file) {
        console.error('Usage: ts-node replay.ts <path-to-sample-log>');
        process.exit(1);
    }
    replay(file).catch(console.error);
}
