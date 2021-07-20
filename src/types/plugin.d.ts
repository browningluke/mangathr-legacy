import { Chapter, Reader, Manga, RSSManga } from "../types";
import { PLUGINS } from "../plugins";

export interface MangaPlugin {
    BASE_URL: string;
    NAME: PLUGINS;
    getUpdateUrl(query: string): Promise<RSSManga>;
    getManga(query: string): Promise<Manga>;
    getChaptersById(id: string): Promise<Chapter[]>;
    selectChapter(chapter: Chapter): Promise<Reader>;
}

interface Manga {
    title: string,
    chapters: Chapter[]
}

interface RSSManga extends Manga {
    id: string,
    rss: boolean
}

export interface Chapter {
    id?: string;
    url?: string;
    title: string;
    num: number;
    opt?: any; // Stores any misc info, preventing
               // the need to make duplicate HTTP requests.
}

export interface Image {
    url: string,
    filename: string
}

export interface Reader {
    chapterTitle: string,
    urls: Image[],
    num: number
}


export { Manga, RSSManga };