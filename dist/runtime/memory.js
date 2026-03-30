export function createWorkingMemory() {
    const entries = [];
    function write(key, value, agent, step) {
        const existing = entries.findIndex((e) => e.key === key);
        const entry = {
            key,
            value,
            timestamp: Date.now(),
            agent,
            step,
        };
        if (existing >= 0) {
            entries[existing] = entry;
        }
        else {
            entries.push(entry);
        }
    }
    function read(key) {
        const entry = entries.find((e) => e.key === key);
        return entry?.value;
    }
    function toContext() {
        if (entries.length === 0)
            return "";
        const lines = entries.map((e) => {
            let line = `[${e.key}]: ${e.value}`;
            if (e.agent)
                line += ` (from: ${e.agent})`;
            return line;
        });
        return `<working_memory>\n${lines.join("\n")}\n</working_memory>`;
    }
    return { entries, write, read, toContext };
}
