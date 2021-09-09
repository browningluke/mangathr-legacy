import { GenericObject, RespBodyType, Scraper } from "@core/scraper";
import { Chapter, IDManga, Image, Manga, MangaPlugin, Reader } from "plugin";
import { pad } from "@helpers/plugins";

const SEARCH_ENDPOINT = "/home_json_search";

export default class Mangakakalot implements MangaPlugin {
    BASE_URL =  "https://mangakakalot.com";
    NAME = "Mangakakalot";
    TEST_QUERY = "solo leveling";

    async _getMangaPage(query: string, update = false): Promise<{ title: string, url: string, body: string }> {
        let mangaUrl;

        if (!update) {
            let searchJson: GenericObject;
            try {
                const res = await Scraper.post(`${this.BASE_URL}${SEARCH_ENDPOINT}`, RespBodyType.JSON,
                    { body: { searchword: query } });
                searchJson = res.data as GenericObject;
            } catch (e) {
                throw new Error("An error occurred while searching.")
            }


            if (!searchJson || searchJson.length <= 0) throw "Could not find manga with the title";

            mangaUrl = searchJson[0].story_link;
        } else {
            mangaUrl = query;
        }

        const mangaRes = await Scraper.get(mangaUrl, RespBodyType.TEXT);

        // Try for mangakakalot
        let mangaTitle = Scraper.css(mangaRes.data as string,
            ".manga-info-text > li:nth-child(1) > h1:nth-child(1)").text();

        // Try for manganelo
        if (!mangaTitle) {
            mangaTitle = Scraper.css(mangaRes.data as string, ".story-info-right > h1:nth-child(1)").text()
        }

        return { title: mangaTitle, url: mangaUrl, body: mangaRes.data as string }
    }

    _getChapters(body: string): Chapter[] {
        // Try for mangakakalot
        let liChapters = Scraper.css(body,
            ".chapter-list > div > span:nth-child(1)");

        // Try for manganelo
        if (liChapters.length == 0) {
            liChapters = Scraper.css(body, ".row-content-chapter li.a-h")
        }

        let chapters: Chapter[] = [];
        liChapters.each((_: number, element: cheerio.Element) => {
            let aNode = Scraper.css(element, "a");

            let url = aNode.attr("href");

            let rawTitle = aNode.text();
            let cleanedTitle = rawTitle.replace(/[\n\t]/gm, "");

            let numberMatch = /[cC]h(apter)? ?(\d+(\.\d+)?)(.*)/.exec(cleanedTitle)!;
            let number = parseFloat(numberMatch[2]);

            chapters.push({
                title: cleanedTitle,
                url: url,
                num: number
            })
        });

        return chapters;
    }


    async getManga(query: string): Promise<Manga> {
        const { title, body } = await this._getMangaPage(query);
        const chapters = this._getChapters(body);

        return {
            title: title,
            chapters: chapters
        };
    }

    async selectChapter(chapter: Chapter): Promise<Reader> {
        let res = await Scraper.get(chapter.url!, RespBodyType.TEXT);

        if (!res.data) throw "An error occurred while getting chapter page";

        let imgList = Scraper.css(res.data as string, ".container-chapter-reader > img");

        let imgURLs: Image[] = [];
        let digits = Math.floor(Math.log10(imgList.length)) + 1;
        imgList.each((i: number, element: any) => {
            let rawUrl = element.attribs['src'];
            let cleanedUrl = rawUrl.replace(/[\n\t]/gm, "");
            let extensionMatch = /\.(\w{3})($|\?\w+)/.exec(cleanedUrl);
            if (!extensionMatch) throw "no extension";

            imgURLs.push({
                filename: `${pad(i + 1, digits)}.${extensionMatch[1]}`,
                url: cleanedUrl
            });
        });


        return {
            chapterTitle: chapter.title,
            urls: imgURLs,
            num: chapter.num
        }
    }

    async getChaptersById(id: string): Promise<Chapter[]> {
        const { body } = await this._getMangaPage(id, true);
        return this._getChapters(body);
    }

    async getUpdateUrl(query: string): Promise<IDManga> {
        const { title, url, body } = await this._getMangaPage(query);
        const chapters = this._getChapters(body);

        return {
            id: url,
            title: title,
            chapters: chapters
        }
    }

}
