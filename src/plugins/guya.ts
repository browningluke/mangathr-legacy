import { Scraper } from "@core/scraper";
import { MangaPlugin, Chapter, Reader, Manga, RSSManga } from "plugin";

type GuyaData = { url: string, filename: string }[];

export default class Guya implements MangaPlugin {
    BASE_URL = "";
    NAME = "GuyaReader";

    private async getMangaAndId(query: string, api = false) {
        let regex = api ? /(\w+\.\w+)\/api\/series\/(.*?)(\/|$)/ : /(\w+\.\w+)\/read\/manga\/(.*?)(\/|$)/;
        let match = regex.exec(query);

        if (!match) {
            throw new Error("Invalid URL entered.");
        }

        let domain = match![1];
        let id = match![2];
        let apiURL = `https://${domain}/api/series/${id}`;

        let resp = await Scraper.get(apiURL);

        if (resp.status_code != 200) {
            throw new Error("An error occurred while getting manga info.");
        }

        let respJSON = JSON.parse(resp.body);

        let chapters: Chapter[] = [];
        for (const i in respJSON.chapters) {
            let chapter = respJSON.chapters[i];
            let folderName = chapter["folder"];

            let groupNumber = Object.keys(chapter["groups"])[0]; // Just grab the first one
            let filenames: string[] = chapter["groups"][groupNumber];

            let opt: GuyaData = filenames.map((a) => {
                let cleanedFilename = /(.*?)(\?|$)/.exec(a)![1];

                return { url: `https://${domain}/media/manga/${id}/chapters/${folderName}/${groupNumber}/${a}`,
                    filename: cleanedFilename}
            });

            let num = parseFloat(i);
            let title = "";
            // Check for empty or null titles
            if (chapter.title == null || chapter.title == "") {
                title = `Chapter ${num}`
            } else if (!chapter.title.toLowerCase().includes("chapter") ||
                !chapter.title.toLowerCase().includes("ch")) {

                title = `Chapter ${num} - ${chapter.title}`;
            }

            chapters.push({
                title: title,
                num: num,
                opt: opt
            })
        }

        let manga = {
            title: respJSON.title,
            chapters: chapters.sort((a, b) => b.num - a.num)
        };

        return { manga, id: apiURL };
    }

    async getManga(query: string): Promise<Manga> {
        return (await this.getMangaAndId(query)).manga;
    }

    async getChaptersById(id: string): Promise<Chapter[]> {
        return (await this.getMangaAndId(id, true)).manga.chapters;
    }

    async getUpdateUrl(query: string): Promise<RSSManga> {
        let { manga, id } = await this.getMangaAndId(query);

        return {
            title: manga.title,
            chapters: manga.chapters,
            id: id,
            rss: false
        }
    }

    async selectChapter(chapter: Chapter): Promise<Reader> {
        return {
            chapterTitle: chapter.title,
            urls: chapter.opt as GuyaData,
            num: chapter.num
        }
    }
}
