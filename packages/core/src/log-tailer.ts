import fs from 'node:fs';
import { EventEmitter } from 'node:events';

export class LogTailer extends EventEmitter {
    private filePath: string;
    private currentSize: number = 0;
    private watcher: fs.FSWatcher | null = null;
    private isTailing: boolean = false;

    constructor(filePath: string) {
        super();
        this.filePath = filePath;
    }

    public start() {
        if (this.isTailing) return;

        try {
            if (!fs.existsSync(this.filePath)) {
                this.emit('error', new Error(`File not found: ${this.filePath}`));
                return;
            }

            const stats = fs.statSync(this.filePath);
            this.currentSize = stats.size;

            // Start watching
            this.watcher = fs.watch(this.filePath, (eventType) => {
                if (eventType === 'change') {
                    this.readNewContent();
                }
            });

            this.isTailing = true;
            console.log(`Started tailing ${this.filePath}`);
        } catch (error) {
            this.emit('error', error);
        }
    }

    public stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.isTailing = false;
    }

    private readNewContent() {
        try {
            const stats = fs.statSync(this.filePath);

            if (stats.size < this.currentSize) {
                // File was truncated (new log started)
                this.currentSize = 0;
            }

            const bytesToRead = stats.size - this.currentSize;
            if (bytesToRead <= 0) return;

            const buffer = Buffer.alloc(bytesToRead);
            const fd = fs.openSync(this.filePath, 'r');
            fs.readSync(fd, buffer, 0, bytesToRead, this.currentSize);
            fs.closeSync(fd);

            this.currentSize = stats.size;
            const content = buffer.toString('utf8');

            this.emit('newLine', content);
        } catch (error) {
            this.emit('error', error);
        }
    }
}
