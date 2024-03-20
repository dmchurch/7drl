// the Term display backend uses this
declare var process: {
    stdout: {
        rows: number;
        columns: number;
        write(data: string): void;
    }
};