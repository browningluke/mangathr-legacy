declare module 'plugin' {
    import { Buffer } from "buffer";

    export interface MangaPlugin {
        BASE_URL: string;
        NAME: string;
        TEST_QUERY: string;

        getUpdateUrl(query: string): Promise<IDManga>;
        getManga(query: string): Promise<Manga>;
        getChaptersById(id: string): Promise<Chapter[]>;
        selectChapter(chapter: Chapter): Promise<Reader>;
        imageDownload?: ImageDownloadFn
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
        filename: string,
        opt?: any; // Stores any misc info, preventing
                   // the need to make duplicate HTTP requests.
    }

    export interface Reader {
        chapterTitle: string,
        urls: Image[],
        num: number
    }

    export interface DownloadItem extends Reader {
        mangaTitle: string,
        refererUrl?: string,
        imageDownload?: ImageDownloadFn;
    }

    export interface ImageDownloadFn {
        (image: Image, filepath: string, refererUrl?: string): Promise<Buffer>;
    }
}