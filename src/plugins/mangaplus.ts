import { Chapter, IDManga, Image, Manga, MangaPlugin, Reader } from "plugin";
import { GenericObject, RespBodyType, Scraper } from "@core/scraper";
import { fuzzySearch, pad } from "@helpers/plugins";
import { retryFetch } from "@helpers/retry-fetch";

import fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import { Root } from "protobufjs/light";

interface MPData {
    encryptionKey: string
}

export default class MangaPlus implements MangaPlugin {

    BASE_URL = "https://jumpg-webapi.tokyo-cdn.com/api";
    REFERER_URL = "https://mangaplus.shueisha.co.jp";
    NAME = "MangaPlus";
    TEST_QUERY = "spy x";

    private LANGUAGE = 0; // English
    private BASE_HEADERS = {
        Origin: this.REFERER_URL,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
        "Session-Token": uuidv4()
    }

    private static ROOT = getProto();

    private static decode(buffer: Buffer) {
        const Response = MangaPlus.ROOT.lookupType("Response");
        const message = Response.decode(buffer);
        return Response.toObject(message, { defaults: true });
    }

    private async searchManga(query: string): Promise<number> {
        // Grab all manga items
        let searchJSON: GenericObject;
        try {
            const resp = await Scraper.get(`${this.BASE_URL}/title_list/allV2`, RespBodyType.BUFFER,
                {
                    opts: { headers: { ...this.BASE_HEADERS, Referer: `${this.BASE_URL}/manga_list/all` } }
                });
            const buffer = resp.data as Buffer;
            searchJSON = MangaPlus.decode(buffer);
        } catch (e) {
            throw new Error("Failed to get all manga data.");
        }

        // Fuzzy search titles
        const allTitles = searchJSON.success.allTitlesViewV2.allTitlesGroup;

        let match: GenericObject | undefined;
        for (const title of allTitles) {
            if (fuzzySearch(query, title.theTitle)) {
                match = title.titles.filter((i: GenericObject) => { return i.language == this.LANGUAGE })[0];
                break;
            }
        }
        if (!match) throw new Error("Could not find a manga with that title.");

        return match.titleId;
    }

    private async getMangaInfo(titleId: string | number) {
        let mangaJSON: GenericObject;
        try {
            const resp = await Scraper.get(`${this.BASE_URL}/title_detailV3`, RespBodyType.BUFFER,
                {
                    params: { title_id: titleId },
                    opts: { headers: { ...this.BASE_HEADERS, Referer: `${this.BASE_URL}/titles/${titleId}` } }
                });
            mangaJSON = MangaPlus.decode(resp.data as Buffer);
        } catch (e) {
            throw new Error("Failed to get manga info.")
        }

        const titleDetailView = mangaJSON.success.titleDetailView;
        const mangaTitle = titleDetailView.title.name;

        // Loop over firstChapterList & lastChapterList separately to allow
        // for repairing of num value of extra chapters.
        const formatChapters = (chapterList: any) => {
            let chapters: Chapter[] = [];
            for (const iString in chapterList) {
                const i = parseInt(iString);
                const currentChapter = chapterList[i];
                const prevChapter = chapterList[i - 1];
                const nextChapter = chapterList[i + 1];

                let chapterNum = parseFloat(currentChapter.name.replace("#", ""));
                if (isNaN(chapterNum)) {
                    (() => {
                        // Try previous chapter num first
                        if (prevChapter) {
                            const num = parseFloat(prevChapter.name.replace("#", ""));
                            if (!isNaN(num)) {
                                chapterNum = num + 0.5;
                                return;
                            }
                        }
                        // Otherwise, try next chapter
                        if (nextChapter) {
                            const num = parseFloat(nextChapter.name.replace("#", ""));
                            if (!isNaN(num)) {
                                chapterNum = num - 0.5;
                                return;
                            }
                        }
                        // If all else fails, set chapter num to 0
                        chapterNum = 0;
                    })()
                }

                // Clean title, if possible
                let chapterTitle: string;
                try {
                    const titleMatch = /.+?\d.? (\w.+?)$/.exec(currentChapter.subTitle);
                    chapterTitle = `Chapter ${chapterNum} - ${titleMatch![1]}`;
                } catch {
                    chapterTitle = currentChapter.subTitle;
                }
                chapters.push({ id: currentChapter.chapterId.toString(), title: chapterTitle, num: chapterNum });
            }

            return chapters;
        }

        // Since protobuf returns chapters in either first or last chapter attr,
        // loop through either block and accumulate whichever chapter array.
        let chapters = [];
        for (const x of titleDetailView.chapters) {
            if (x.firstChapterList.length > 0) {
                chapters.push(...formatChapters(x.firstChapterList));
            }

            if (x.lastChapterList.length > 0) {
                chapters.push(...formatChapters(x.lastChapterList));
            }
        }

        return {
            title: mangaTitle,
            chapters: chapters.reverse(),
        }
    }

    async getManga(query: string): Promise<Manga> {
        const titleId = await this.searchManga(query);
        return await this.getMangaInfo(titleId);
    }

    async getUpdateUrl(query: string): Promise<IDManga> {
        const titleId = await this.searchManga(query);
        return {
            ...(await this.getMangaInfo(titleId)),
            id: `${titleId}`,
        }
    }

    async getChaptersById(id: string): Promise<Chapter[]> {
        return (await this.getMangaInfo(id)).chapters;
    }

    async selectChapter(chapter: Chapter): Promise<Reader> {
        let readerJSON: GenericObject;
        try {
            const resp = await Scraper.get(`${this.BASE_URL}/manga_viewer`, RespBodyType.BUFFER,
                {
                    params: { chapter_id: chapter.id, split: "yes", img_quality: "super_high" },
                    opts: { headers: { ...this.BASE_HEADERS, Referer: `${this.BASE_URL}/viewer/${chapter.id}` } }
                });
            readerJSON = MangaPlus.decode(resp.data as Buffer);
        } catch (e) {
            throw new Error("Failed to get manga viewer.");
        }
        const pageList = readerJSON.success.mangaViewer.pages;

        let imgURLs: Image[] = [];
        const digits = Math.floor(Math.log10(pageList.length)) + 1;
        pageList.forEach((p: any, i: number) => {
            if (p.page == null) return;
            const extMatch = /\d+\.(\w{3})\?/.exec(p.page.imageUrl);
            if (!extMatch || !extMatch[1]) throw new Error("Failed getting image extension.");

            imgURLs.push({
                filename: `${pad(i + 1, digits)}.${extMatch[1]}`,
                url: p.page.imageUrl,
                opt: { encryptionKey: p.page.encryptionKey }
            });
        })

        return {
            chapterTitle: chapter.title,
            urls: imgURLs,
            num: chapter.num,
        }
    }

    public imageDownload() {
        return async (image: Image, filepath: string, refererUrl?: string) => {
            const { url, opt } = image;
            const { Origin: _, ...headers } = this.BASE_HEADERS;

            const key = hexStringToByte((opt as MPData).encryptionKey);
            const a = key.length;

            let res, data;
            try {
                res = await retryFetch(url, {
                    headers: { ...headers, Referer: url }
                }, 10, 1000)
                const buffer = await res.buffer();

                // Decrypt image
                data = Uint8Array.from(buffer);
                for (const x in data) {
                    const i = x as unknown as number; // x is a number, TS thinks is a string
                    data[i] = data[i] ^ key[i % a]
                }
            } catch (e) {
                fs.rmSync(filepath);
                throw new Error("Failed downloading an image. Giving up on this chapter.");
            }
            return Buffer.from(data);
        }
    }
}

function hexStringToByte(str: string) {
    let a = [];
    for (let i = 0, len = str.length; i < len; i += 2) {
        a.push(parseInt(str.substr(i, 2), 16));
    }
    return new Uint8Array(a);
}

/*
    MangaPlus .proto definition
 */

function getProto() {
    return Root.fromJSON({
        "nested": {
            "Response": {
                "oneofs": { "data": { "oneof": ["success", "error"] } },
                "fields": {
                    "success": { "type": "SuccessResult", "id": 1 },
                }
            },
            "SuccessResult": {
                "oneofs": {
                    "data": {
                        "oneof": ["titleDetailView", "mangaViewer", "allTitlesViewV2"]
                    }
                },
                "fields": {
                    "isFeaturedUpdated": { "type": "bool", "id": 1 },
                    "titleDetailView": { "type": "TitleDetailView", "id": 8 },
                    "mangaViewer": { "type": "MangaViewer", "id": 10 },
                    "allTitlesViewV2": { "type": "AllTitlesViewV2", "id": 25 },
                }
            },
            "AllTitlesViewV2": {
                "fields": {
                    "allTitlesGroup": { "rule": "repeated", "type": "AllTitlesGroup", "id": 1 }
                }
            },
            "AllTitlesGroup": {
                "fields": {
                    "theTitle": { "type": "string", "id": 1 },
                    "titles": { "rule": "repeated", "type": "Title", "id": 2 }
                }
            },
            "TitleDetailView": {
                "fields": {
                    "title": { "type": "Title", "id": 1 },
                    "chapters": { "rule": "repeated", "type": "ChapterBlock", "id": 28}
                }
            },
            "ChapterBlock": {
                "fields": {
                    "firstChapterList": { "rule": "repeated", "type": "Chapter", "id": 2 },
                    "lastChapterList": { "rule": "repeated", "type": "Chapter", "id": 4 },
                }
            },
            "MangaViewer": {
                "fields": {
                    "pages": { "rule": "repeated", "type": "Page", "id": 1 }
                }
            },
            "Title": {
                "fields": {
                    "titleId": { "type": "uint32", "id": 1 },
                    "name": { "type": "string", "id": 2 },
                    "language": { "type": "Language", "id": 7, "options": { "default": 0 } }
                }
            },
            "Language": {
                "values": {
                    "ENGLISH": 0, "SPANISH": 1, "FRENCH": 2, "INDONESIAN": 3,
                    "PORTUGUESE_BR": 4, "RUSSIAN": 5, "THAI": 6
                }
            },
            "Chapter": {
                "fields": {
                    "titleId": { "type": "uint32", "id": 1 },
                    "chapterId": { "type": "uint32", "id": 2 },
                    "name": { "type": "string", "id": 3 },
                    "subTitle": { "type": "string", "id": 4 },
                }
            },
            "Page": {
                "fields": {
                    "page": { "type": "MangaPage", "id": 1 }
                }
            },
            "MangaPage": {
                "fields": {
                    "imageUrl": { "type": "string", "id": 1 },
                    "width": { "type": "uint32", "id": 2 },
                    "height": { "type": "uint32", "id": 3 },
                    "encryptionKey": { "type": "string", "id": 5 }
                }
            }
        }
    });
}
