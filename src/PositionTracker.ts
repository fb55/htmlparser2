export interface Position {
    line: number;
    column: number;
}

/** Allows getting a line/column position for a given index. */
export class PositionTracker {
    /** The last index passed to `getPosition`. */
    private lastIndex = 0;
    /** The line number at the last index. */
    private line = 1;
    /** The column of the last index. */
    private column = 1;

    /** The index of the next newline character in the current buffer. */
    private nextNewLine = -1;
    /** The buffer currently being processed. */
    private currentBuffer = "";
    /** The offset of the current buffer in the total input. */
    private currentBufferOffset = 0;
    /** Queue of buffers that haven't been processed yet. */
    private readonly nextBuffers: string[] = [];

    /**
     * Gets line and column for a given index.
     *
     * @param index The index to get the position for. Must be greater or equal to the last index passed to `getPosition`.
     * @returns The position of the given index.
     */
    public getPosition(index: number): Position {
        if (index < this.lastIndex) {
            throw new Error("Indices must monotonically increase");
        }

        while (
            this.nextNewLine > 0 &&
            index >= this.nextNewLine + this.currentBufferOffset
        ) {
            this.column = 1;
            this.line++;
            this.lastIndex = this.nextNewLine + this.currentBufferOffset;
            this.getNextNewLine();
        }

        this.column += index - this.lastIndex;
        this.lastIndex = index;
        return { line: this.line, column: this.column };
    }

    /** Push a new buffer onto the queue. */
    public push(chunk: string): void {
        // If we don't have a newline, we won't have any next buffers.
        if (this.nextNewLine < 0) {
            // Replace the current buffer, and get the next newline index.
            this.currentBufferOffset += this.currentBuffer.length;
            this.currentBuffer = chunk;
            this.getNextNewLine();
        } else {
            this.nextBuffers.push(chunk);
        }
    }

    /** Calculate the next newline index. */
    private getNextNewLine(): void {
        this.nextNewLine = this.currentBuffer.indexOf(
            "\n",
            this.nextNewLine + 1
        );

        if (this.nextNewLine < 0) {
            const next = this.nextBuffers.shift();

            if (next == null) return;
            this.currentBufferOffset += this.currentBuffer.length;
            this.currentBuffer = next;
            this.getNextNewLine();
        }
    }
}
