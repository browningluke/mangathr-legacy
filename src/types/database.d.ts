import { PLUGINS } from "../plugins";

export interface Database {
    setup(): Promise<void>;
    close(): Promise<void>;
    findAll();
    registerManga(manga: MangaUpdate): Promise<void>;
    forEach(func: (manga: MangaUpdate) => Promise<MangaUpdate>, sleep?: number): Promise<void>;
}

// Database schema
interface MangaUpdate {
    plugin: PLUGINS;
    title: string;
    id: string;
    //rss: boolean;
    chapters: number[]; // List of numbers (lower case)
}

export { MangaUpdate };