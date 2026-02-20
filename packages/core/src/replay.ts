import fs from 'node:fs';
import path from 'node:path';

/**
 * Replay feeds lines from a source file (fixture) into a target file (live log)
 * to simulate MTGA log activity for the desktop app.
 */
export async function replay(sourcePath: string, targetPath: string, delayMs: number = 500) {
    console.log(`[Replay] Source: ${sourcePath}`);
    console.log(`[Replay] Target: ${targetPath}`);
    console.log(`[Replay] Delay:  ${delayMs}ms`);

    if (!fs.existsSync(sourcePath)) {
        console.error(`Error: Source file not found: ${sourcePath}`);
        process.exit(1);
    }

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Clear target file
    fs.writeFileSync(targetPath, '');

    const content = fs.readFileSync(sourcePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
        if (line.trim()) {
            fs.appendFileSync(targetPath, line + '\n');
            console.log(`[Replay] Appended line: ${line.substring(0, 50)}...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    console.log('[Replay] Finished.');
}

async function main() {
    // Basic argument parsing
    const args = process.argv.slice(2);
    let source = '';
    let target = '';
    let delay = 500;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--source' && args[i + 1]) source = args[i + 1];
        if (args[i] === '--target' && args[i + 1]) target = args[i + 1];
        if (args[i] === '--delay' && args[i + 1]) delay = parseInt(args[i + 1]);
    }

    if (!source || !target) {
        console.error('Usage: node replay.js --source <path> --target <path> [--delay <ms>]');
        process.exit(1);
    }

    await replay(source, target, delay);
}

if (require.main === module) {
    main().catch(console.error);
}
