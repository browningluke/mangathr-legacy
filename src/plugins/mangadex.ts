import { Scraper } from "@core/scraper";
import { MangaPlugin, Chapter, Image, Reader, Manga, RSSManga } from "plugin";
import { pad } from "@helpers/plugins";

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

// TODO: support chapters with more than 500 total chapters (due to API query limit)

export default class MangaDex implements MangaPlugin {

    BASE_URL = "https://api.mangadex.org";
    NAME = "MangaDex";

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
        let resp = await Scraper.get(`${this.BASE_URL}/manga`, {
            title: query
        }, false);

        if (resp.status_code != 200) throw new Error("An error occurred while searching.");

        let searchJSON = JSON.parse(resp.body);

        if (searchJSON['total'] == 0) return null;

        return searchJSON['results'][0]["data"]["id"];
    }

    private async getMangaInfoJSON(id: string) {
        let mangaInfoResp = await Scraper.get(`${this.BASE_URL}/manga/${id}`);
        let mangaInfoJSON = JSON.parse(mangaInfoResp.body);

        if (mangaInfoJSON["result"] != "ok") {
            throw new Error(mangaInfoJSON["errors"][0]["detail"]);
        }
        return mangaInfoJSON["data"];
    }

    /*
        Handle User-queried Titles
     */

    private async getGroupsForChapters(chapters: RawChapter[]): Promise<Chapter[]> {
        let scanlationGroups: any = {};
        let newChapters: Chapter[] = [];

        for (const element of chapters) {
            let groups = [];

            if (element.groups.length == 0) groups.push("N/A");

            for (const id of element.groups) {
                if (!(id in scanlationGroups)) {
                    let resp = await Scraper.get(`${this.BASE_URL}/group/${id}`);
                    let respJSON = JSON.parse(resp.body);

                    let groupName = respJSON["data"]["attributes"]["name"];
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
        let resp = await Scraper.get(`${this.BASE_URL}/manga/${id}/feed`, {
            limit: 500,
            "translatedLanguage[]": "en",
            "order[chapter]": "desc"
        }, false);

        let respJSON = JSON.parse(resp.body);
        let mangaInfoJSON = await this.getMangaInfoJSON(id);
        let mangaTitle = mangaInfoJSON["attributes"]["title"]["en"];
        mangaTitle = mangaTitle ? mangaTitle : mangaInfoJSON["attributes"]["title"]["jp"];

        // Format all chapters
        let rawChapters: RawChapter[] = [];
        for (const element of respJSON['results']) {
            let attributes = element["data"]["attributes"];

            let id = element["data"]["id"];

            let chapterNumString = attributes["chapter"];
            let chapterNum = parseFloat(chapterNumString);

            // Format title
            let chapterTitle = `Chapter ${chapterNum}`;
            if (attributes["title"] != "" && attributes["title"] != null) {
                chapterTitle += ` - ${attributes["title"]}`;
            }

            let opt: MDData = {
                hash: attributes["hash"],
                pages: attributes["data"]
            }

            let groups: string[] = element["relationships"]
                .filter((obj: any) => obj.type == "scanlation_group")
                .map((obj: any) => obj.id);

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
            title: mangaTitle,
            chapters: chapters,
            id: mangaInfoJSON["id"]
        }
    }

    /*
        Handle User-queried single Chapter
     */

    // NOTE: Returned ID is of parent TITLE not chapter
    private async getChapterFromChapterID(id: string): Promise<{chapters: Chapter[], id: string, title: string}> {
        let resp = await Scraper.get(`${this.BASE_URL}/chapter/${id}`);
        let respJSON = JSON.parse(resp.body);

        if (respJSON["result"] != "ok") {
            throw new Error(respJSON["errors"][0]["detail"]);
        }

        let attributes = respJSON["data"]["attributes"];
        let parentId = respJSON["relationships"]
            .filter((a: { id: string, type: string }) => a.type ==  "manga")[0]["id"];

        let parentInfoJSON = await this.getMangaInfoJSON(parentId);
        let mangaTitle = parentInfoJSON["attributes"]["title"]["en"];
        mangaTitle = mangaTitle ? mangaTitle : parentInfoJSON["attributes"]["title"]["jp"];

        let opt: MDData = {
            hash: attributes["hash"],
            pages: attributes["data"]
        }

        let chapter = {
            id: id,
            title: attributes["title"],
            num: attributes["chapter"],
            opt: opt
        }

        return {
            chapters: [chapter],
            id: parentId,
            title: mangaTitle
        }
    }

    private async getMangaAndID(query: string): Promise<{chapters: Chapter[], id: string, title: string}> {
        let parsedURL = MangaDex.parseURL(query);

        let id = parsedURL ? parsedURL['id'] : await this.searchQuery(query);
        let type = parsedURL ? parsedURL['type'] : URLType.TITLE;
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
        let resp = await Scraper.get(`${this.BASE_URL}/at-home/server/${chapter.id}`);
        let respJSON = JSON.parse(resp.body);

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

    async getUpdateUrl(query: string): Promise<RSSManga> {
        let { title, chapters, id } = await this.getMangaAndID(query);

        return {
            id: id,
            rss: false,
            title: title,
            chapters: chapters
        };
    }

    async getChaptersById(id: string): Promise<Chapter[]> {
        return (await this.getManga(id)).chapters;
    }
}

