import { GenericObject, RespBodyType, Scraper } from "@core/scraper";
import { Chapter, IDManga, Image, Manga, MangaPlugin, Reader } from "plugin";
import { pad } from "@helpers/plugins";

/*
    MangaDex API Types
 */

interface MDAPIManga {
    id: string;
    type: "manga";
    attributes: {
        title: { en?: string; jp?: string; }
    }
    relationships: {
        id: string;
        type: "author" | "artist" | "cover_art"
    }[]
}

interface MDAPIChapter {
    id: string;
    type: "chapter";
    attributes: {
        volume: string;
        chapter: string;
        title: string;
        hash: string;
        data: string[];
        dataSaver: string[];
    }
    relationships: {
        id: string;
        type: "scanlation_group" | "manga" | "user"
    }[]
}

interface MDAPIGroup {
    id: string;
    type: "scanlation_group";
    attributes: { name: string }
}

/*
    Response Types
 */

interface MDAPIRespRoot {
    result: "ok" | "error";
    response: string;
    errors?: {
        id: string;
        status: number;
        title: string;
        detail: string;
    }[]
}

interface MDAPIRespList extends MDAPIRespRoot { limit: number; offset: number; total: number; }

// Manga Types
interface MDAPIMangaResp extends MDAPIRespRoot { data: MDAPIManga }
interface MDAPIMangaSearchResp extends MDAPIRespList { data: MDAPIManga[] }
interface MDAPIMangaFeedResp extends MDAPIRespList { data: MDAPIChapter[] }

// Other Types
interface MDAPIChapterResp extends MDAPIRespRoot { data: MDAPIChapter }
interface MDAPIGroupResp extends MDAPIRespRoot { data: MDAPIGroup }

/*
    Custom Types
 */

interface MDData {
    hash: string;
    pages: string[];
}

interface RawChapter extends Chapter {
    groups: string[]
}

enum URLType {
    CHAPTER = "chapter",
    TITLE = "title"
}

export default class MangaDex implements MangaPlugin {

    BASE_URL = "https://api.mangadex.org";
    NAME = "MangaDex";
    TEST_QUERY = "https://mangadex.org/title/f9c33607-9180-4ba6-b85c-e4b5faee7192";

    private static parseURL(query: string): { id: string, type: URLType } | null {
        // Attempt to match chapter/title URL
        let urlMatch = /mangadex\.org\/(title|chapter)\/(.*?)($|\/|\?)/.exec(query);

        if (urlMatch && urlMatch[1] && urlMatch[2]) {
            return {
                id: urlMatch[2],
                type: urlMatch[1] as URLType
            }
        } else {
            // Only if URL match fails, then try to match ID (WITH TITLE ONLY)
            let idMatch = /([\w\d]{8}-([\w\d]{4}-){3}[\w\d]{12}$)/.exec(query);
            return idMatch ? { id: idMatch[1], type: URLType.TITLE } : null
        }
    }

    private async searchQuery(query: string): Promise<string | null> {
        let searchJSON: MDAPIMangaSearchResp;
        try {
            let resp = await Scraper.get(`${this.BASE_URL}/manga`, RespBodyType.JSON,
                { params: { title: query, "order[relevance]": "desc", limit: 1 }, escape: false });
            searchJSON = resp.data as MDAPIMangaSearchResp;
        } catch (e) {
            throw new Error("An error occurred while searching.");
        }
        if (searchJSON.total == 0) return null;

        return searchJSON.data[0].id;
    }

    private async getMangaInfoJSON(id: string): Promise<MDAPIManga> {
        let mangaInfoJSON: MDAPIMangaResp;
        try {
            let mangaInfoResp = await Scraper.get(`${this.BASE_URL}/manga/${id}`, RespBodyType.JSON);
            mangaInfoJSON = mangaInfoResp.data as MDAPIMangaResp;
        } catch (e) {
            throw new Error("An error occurred while getting manga info JSON.");
        }

        if (mangaInfoJSON.result != "ok") {
            throw new Error(mangaInfoJSON.errors![0].detail);
        }
        return mangaInfoJSON.data;
    }

    // Loop to get over 500 chapter limit
    private async getAllChapterData(id: string): Promise<MDAPIChapter[]> {
        const getData = async (offset: number): Promise<MDAPIMangaFeedResp> => {
            try {
                let resp = await Scraper.get(`${this.BASE_URL}/manga/${id}/feed`, RespBodyType.JSON,
                    {
                        escape: true,
                        params: {
                            limit: 500, offset: offset,
                            "translatedLanguage[]": "en", "order[chapter]": "desc",
                        }
                    });
                return resp.data as MDAPIMangaFeedResp;
            } catch (e) {
                throw new Error("An error occurred while getting chapter feed.");
            }
        }

        const firstChapters = await getData(0);
        const total = firstChapters.total;

        let restChapters: MDAPIChapter[] = [];
        const x = Math.ceil(total / 500) - 1;
        for (let i = 0; i < x; i++) {
            const chapters = (await getData(500 + 500 * i)).data;
            restChapters.push(...chapters);
        }

        return [...firstChapters.data, ...restChapters];
    }

    /*
        Handle User-queried Titles
     */

    private async getGroupsForChapters(chapters: RawChapter[]): Promise<Chapter[]> {
        let scanlationGroups: { [key in string]: any } = {};
        let newChapters: Chapter[] = [];

        for (const element of chapters) {
            let groups = [];

            if (element.groups.length == 0) groups.push("N/A");

            for (const id of element.groups) {
                if (!(id in scanlationGroups)) {
                    let resp = await Scraper.get(`${this.BASE_URL}/group/${id}`, RespBodyType.JSON);
                    if (resp.status_code != 200) throw new Error("Failed to get scanlation group data.");
                    let respJSON = resp.data as MDAPIGroupResp;

                    let groupName = respJSON.data.attributes.name;
                    scanlationGroups[id] = groupName; // Cache name
                    groups.push(groupName);
                } else {
                    //console.log(`Got ${scanlationGroups[obj.id]} from cache`);
                    groups.push(scanlationGroups[id]);
                }
            }

            let groupString = groups.reduce((prev, curr) => {
                return prev != "" ? `${prev}|${curr}` : `${curr}`;
            }, "");

            groupString = groupString.length == 0 ? "" : `[${groupString}]`;

            newChapters.push({
                id: element.id,
                title: `${element.title} ${groupString}`,
                num: element.num,
                opt: element.opt
            })
        }
        return newChapters;
    }

    private async getChaptersFromTitleID(id: string): Promise<{chapters: Chapter[], id: string, title: string}> {
        let mangaInfoJSON = await this.getMangaInfoJSON(id);
        let mangaTitle = mangaInfoJSON.attributes.title.en;
        mangaTitle = mangaTitle ? mangaTitle : mangaInfoJSON.attributes.title.jp;

        let chapterData = await this.getAllChapterData(id);

        // Format all chapters
        let rawChapters: RawChapter[] = [];
        for (const element of chapterData) {
            let attributes = element.attributes;
            let id = element.id;

            let chapterNumString = attributes.chapter;
            let chapterNum = parseFloat(chapterNumString);

            // Fixes Oneshots being labeled as NaN
            if (isNaN(chapterNum) && attributes["title"].toLowerCase().includes("oneshot")) chapterNum = 0;

            // Format title
            let chapterTitle = `Chapter ${chapterNum}`;
            if (attributes.title != "" && attributes.title != null) {
                chapterTitle += ` - ${attributes.title}`;
            }

            let opt: MDData = {
                hash: attributes.hash,
                pages: attributes.data
            }

            let groups: string[] = element.relationships
                .filter((obj) => obj.type == "scanlation_group")
                .map((obj) => obj.id);

            rawChapters.push({
                id: id,
                title: chapterTitle,
                num: chapterNum,
                opt: opt,
                groups: groups
            })
        }

        // Find (& extract) all duplicate chapters
        // <citation> Code to find duplicate objects taken from:
        // https://stackoverflow.com/a/53212154
        const lookup = rawChapters.reduce((a: any, e: any) => {
            a[e.num] = ++a[e.num] || 0;
            return a;
        }, {});

        let duplicateChapters = rawChapters.filter(e => lookup[e.num]);
        let uniqueChapters: Chapter[] = rawChapters.filter(e => !lookup[e.num]).map((x) => {
            const {groups, ...chapter} = x;
            return chapter;
        });
        // </citation>

        // Call getGroupsForChapters for all duplicate chapters
        let duplicateChaptersWithGroup = await this.getGroupsForChapters(duplicateChapters);
        let chapters = [...uniqueChapters, ...duplicateChaptersWithGroup]
            .sort((a, b) => b.num - a.num);

        return {
            title: mangaTitle!,
            chapters: chapters,
            id: mangaInfoJSON.id
        }
    }

    /*
        Handle User-queried single Chapter
     */

    // NOTE: Returned ID is of parent TITLE not chapter
    private async getChapterFromChapterID(id: string): Promise<{chapters: Chapter[], id: string, title: string}> {
        let respJSON: MDAPIChapterResp;
        try {
            let resp = await Scraper.get(`${this.BASE_URL}/chapter/${id}`, RespBodyType.JSON);
            respJSON = resp.data as MDAPIChapterResp;
        } catch (e) {
            throw new Error("An error occurred while getting chapter info.")
        }

        if (respJSON.result != "ok") {
            throw new Error(respJSON.errors![0].detail);
        }

        let attributes = respJSON.data.attributes;
        let parentId = respJSON.data.relationships
            .filter((a) => a.type ==  "manga")[0].id;

        let parentInfoJSON = await this.getMangaInfoJSON(parentId);
        let mangaTitle = parentInfoJSON.attributes.title.en
        mangaTitle = mangaTitle ? mangaTitle : parentInfoJSON.attributes.title.jp;

        let opt: MDData = {
            hash: attributes.hash,
            pages: attributes.data
        }

        let chapterNum = parseFloat(attributes.chapter);
        let chapterTitle = `Chapter ${chapterNum}`;
        if (attributes.title != "" && attributes.title != null) {
            chapterTitle += ` - ${attributes.title}`;
        }

        let chapter = {
            id: id,
            title: chapterTitle,
            num: chapterNum,
            opt: opt
        }

        return {
            chapters: [chapter],
            id: parentId,
            title: mangaTitle!
        }
    }

    private async getMangaAndID(query: string): Promise<{chapters: Chapter[], id: string, title: string}> {
        let parsedURL = MangaDex.parseURL(query);

        let id = parsedURL ? parsedURL.id : await this.searchQuery(query);
        let type = parsedURL ? parsedURL.type : URLType.TITLE;
        if (!id) throw new Error("Could not find manga with that title.");

        if (type == URLType.TITLE) {
            return await this.getChaptersFromTitleID(id);
        } else if (type == URLType.CHAPTER) {
            return await this.getChapterFromChapterID(id);
        }

        throw new Error("URLType was somehow not title or chapter.");
    }

    async getManga(query: string): Promise<Manga> {
        let { title, chapters } = await this.getMangaAndID(query);

        return {
            title: title,
            chapters: chapters
        };
    }

    async selectChapter(chapter: Chapter): Promise<Reader> {
        let mdData = chapter.opt as MDData;

        // Fetch BaseURL
        let resp = await Scraper.get(`${this.BASE_URL}/at-home/server/${chapter.id}`, RespBodyType.JSON);
        if (resp.status_code != 200) throw new Error("Failed to get M@Home url.");
        let respJSON = resp.data as GenericObject;
        let MDHomeBaseURL = respJSON['baseUrl'];

        // Build URLs
        let imgURLs: Image[] = [];
        const digits = Math.floor(Math.log10(mdData.pages.length)) + 1;
        mdData.pages.forEach((element: string, i: number) => {
            imgURLs.push({
                filename: `${pad(i + 1, digits)}.${element.substr(-3)}`,
                url: `${MDHomeBaseURL}/data/${mdData.hash}/${element}`,
            });

        });

        return {
            chapterTitle: chapter.title,
            num: chapter.num,
            urls: imgURLs
        };
    }

    async getUpdateUrl(query: string): Promise<IDManga> {
        let { title, chapters, id } = await this.getMangaAndID(query);

        return {
            id: id,
            title: title,
            chapters: chapters
        };
    }

    async getChaptersById(id: string): Promise<Chapter[]> {
        return (await this.getManga(id)).chapters;
    }
}

