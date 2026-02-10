export type StorageEnvelope<T> = {
    v: number;        // schema version
    t: number;        // saved timestamp (ms)
    data: T;
};

export type MigrationFn<T> = (rawData: unknown, fromVersion: number) => T;

type StorageKeyConfig<T> = {
    version: number;
    migrate?: MigrationFn<T>;
};

const PREFIX = "ghost:"; // namespacing so keys don't collide with other apps

const now = () => Date.now();

const safeParse = (text: string): unknown => {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
};

const safeStringify = (value: unknown): string | null => {
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
};

export const storage = {
    getJSON<T>(
        key: string,
        fallback: T,
        config?: StorageKeyConfig<T>
    ): T {
        if (typeof window === "undefined") return fallback;

        const fullKey = PREFIX + key;

        let raw: string | null = null;
        try {
        raw = window.localStorage.getItem(fullKey);
        } catch {
        return fallback;
        }

        if (!raw) return fallback;

        const parsed = safeParse(raw);
            if (parsed === null || parsed === undefined) return fallback;

            // ✅ If it's a primitive (string/number/bool), allow it (legacy raw JSON path)
            if (typeof parsed !== "object") {
            // If migration exists, migrate from version 0
            if (config?.migrate) {
                try {
                const migrated = config.migrate(parsed, 0);
                storage.setJSON<T>(key, migrated, { version: config.version });
                return migrated;
                } catch {
                return fallback;
                }
            }

            return (parsed as T) ?? fallback;
            }


        // Envelope path
        const maybeEnv = parsed as Partial<StorageEnvelope<unknown>>;
        const hasEnvelope =
        typeof maybeEnv.v === "number" &&
        "data" in maybeEnv;

        if (hasEnvelope) {
        const envVersion = maybeEnv.v ?? 0;
        const envData = maybeEnv.data;

        const targetVersion = config?.version ?? envVersion;

        // If same version, return as-is (best-effort typed)
        if (envVersion === targetVersion) {
            return (envData as T) ?? fallback;
        }

        // If migration is provided, migrate
        if (config?.migrate) {
            try {
            const migrated = config.migrate(envData, envVersion);
            // write back in new envelope version
            storage.setJSON<T>(key, migrated, { version: targetVersion });
            return migrated;
            } catch {
            return fallback;
            }
        }

        // No migration: if versions differ, fallback (safest)
        return fallback;
        }

        // Legacy raw JSON path (no envelope)
        if (config?.migrate) {
        try {
            const migrated = config.migrate(parsed, 0);
            storage.setJSON<T>(key, migrated, { version: config.version });
            return migrated;
        } catch {
            return fallback;
        }
        }

        // If no migration, best-effort cast
        return (parsed as T) ?? fallback;
    },

    
    setJSON<T>(
        key: string,
        value: T,
        config?: { version?: number }
    ): boolean {
        if (typeof window === "undefined") return false;

        const fullKey = PREFIX + key;

        const payload =
        typeof config?.version === "number"
            ? ({ v: config.version, t: now(), data: value } satisfies StorageEnvelope<T>)
            : value;

        const str = safeStringify(payload);
        if (str == null) return false;

        try {
        window.localStorage.setItem(fullKey, str);
        return true;
        } catch {
        return false;
        }
    },

    remove(key: string): void {
        if (typeof window === "undefined") return;
        try {
        window.localStorage.removeItem(PREFIX + key);
        } catch {
        // ignore
        }
    },

    /**
     * Useful for debugging: list only this app's keys
     */
    listKeys(): string[] {
        if (typeof window === "undefined") return [];
        try {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && k.startsWith(PREFIX)) keys.push(k);
        }
        return keys;
        } catch {
        return [];
        }
    },
};
