import { Scraper } from "../scraper";
import { MangaPlugin, Chapter, Image, Manga, Reader, RSSManga } from "../types/plugin";
import { pad } from "../helpers/plugins";

const API_ENDPOINT = "/wp-admin/admin-ajax.php";

export default class MangaSushi implements MangaPlugin {

    BASE_URL = "https://mangasushi.net";
    NAME = "MangaSushi";

    async _getMangaPage(query: string): Promise<{ mangaTitle: string, mangaId: string }> {
        const res = await Scraper.post(`${this.BASE_URL}${API_ENDPOINT}`, {
            action: "wp-manga-search-manga",
            title: query
        });

        if (!res.body) {
            throw "An error occurred while searching";
        }

        let searchJson = JSON.parse(res.body);

        if (!searchJson.success) {
            if (searchJson.data[0]?.error) {
                throw "Could not find manga with the title";
            }
            throw searchJson.data[0].message;
        }

        let mangaTitle = searchJson.data[0].title;
        let mangaUrl = searchJson.data[0].url;

        const mangaRes = await Scraper.get(mangaUrl);

        if (!mangaRes.body) throw "Failed to get manga page";
        let shortLink = Scraper.css(mangaRes.body, "link[rel=\"shortlink\"]")
            .attr("href")!;

        let mangaId = /\/\?p=(.+)/.exec(shortLink)![1];

        return { mangaTitle, mangaId };
    }

    async _getChapters(mangaId: string): Promise<Chapter[]> {
        const chapterRes = await Scraper.post(`${this.BASE_URL}${API_ENDPOINT}`, {
            action: "manga_get_chapters",
            manga: mangaId
        });

        if (!chapterRes.body) throw "Failed to get chapter page";
        let liChapters = Scraper.css(chapterRes.body, "ul li.wp-manga-chapter");

        let chapters: Chapter[] = [];
        liChapters.each((_: number, element: cheerio.Element) => {
            let aNode = Scraper.css(element, "a");

            let rawTitle = aNode.text();
            let cleanedTitle = rawTitle.replace(/[\n\t]/gm, "");

            let numberMatch = /[cC]h(apter)? ?(\d+(\.\d+)?)(.*)/.exec(cleanedTitle)!;
            let number = parseFloat(numberMatch[2]);

            let url = aNode.attr("href");

            chapters.push({
                title: cleanedTitle,
                url: url,
                num: number
            })
        });

        return chapters;
    }

    async getManga(query: string): Promise<Manga> {
        let { mangaTitle, mangaId } = await this._getMangaPage(query);
        let chapters = await this._getChapters(mangaId);

        return {
            title: mangaTitle,
            chapters: chapters
        };
    }

    // TODO: implement this
    async getChaptersById(id: string): Promise<Chapter[]> {
        return await this._getChapters(id);
    }

    async selectChapter(chapter: Chapter): Promise<Reader> {
        let res = await Scraper.get(chapter.url!);

        if (!res.body) throw "An error occurred while getting chapter page";

        let imgList = Scraper.css(res.body!, "img[id*=\"image-\"]");
        //console.log(imgList);

        let imgURLs: Image[] = [];
        let digits = Math.floor(Math.log10(imgList.length)) + 1;
        imgList.each((i: number, element: any) => {
            let rawUrl = element.attribs['data-src'];
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

    async getUpdateUrl(query: string): Promise<RSSManga> {
        let { mangaTitle, mangaId } = await this._getMangaPage(query);
        let chapters = await this._getChapters(mangaId);

        return {
            title: mangaTitle,
            rss: false,
            chapters: chapters,
            id: mangaId
        }
    }
}
