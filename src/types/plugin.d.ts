declare module 'plugin' {
    export interface MangaPlugin {
        BASE_URL: string;
        NAME: string;

        getUpdateUrl(query: string): Promise<IDManga>;

        getManga(query: string): Promise<Manga>;

        getChaptersById(id: string): Promise<Chapter[]>;

        selectChapter(chapter: Chapter): Promise<Reader>;
    }

    export interface Manga {
        title: string,
        chapters: Chapter[]
    }

    export interface IDManga extends Manga {
        id: string
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
}