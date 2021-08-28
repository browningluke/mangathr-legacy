export interface Database {
    setup(): Promise<void>;
    close(): Promise<void>;
    findAll();
    find(obj: Partial<MangaUpdate>);
    registerManga(manga: MangaUpdate): Promise<void>;
    forEach(func: (manga: MangaUpdate) => Promise<MangaUpdate>, sleep?: number): Promise<void>;
}

// Database schema
interface MangaUpdate {
    plugin: string; // Loose type check (should always be one of ALL_PLUGIN_NAMES)
    title: string;
    id: string;
    //rss: boolean;
    chapters: number[]; // List of numbers (lower case)
}

export { MangaUpdate };