declare module 'database' {
    export interface Database {
        setup(): Promise<void>;
        close(): Promise<void>;
        findAll();
        find(obj: Partial<MangaUpdate>);
        registerManga(manga: MangaUpdate): Promise<void>;
        forEach(func: (manga: MangaUpdate) => Promise<MangaUpdate>, sleep?: number): Promise<void>;
    }

    // Database schema
    export interface MangaUpdate {
        plugin: string; // Loose type check (should always be one of ALL_PLUGIN_NAMES)
        title: string;
        id: string;
        chapters: number[]; // List of numbers (lower case)
    }
}