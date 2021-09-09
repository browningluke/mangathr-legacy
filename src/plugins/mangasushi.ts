import { GenericObject, RespBodyType, Scraper } from "@core/scraper";
import { Chapter, IDManga, Image, Manga, MangaPlugin, Reader } from "plugin";
import { pad } from "@helpers/plugins";

const API_ENDPOINT = "/wp-admin/admin-ajax.php";

export default class MangaSushi implements MangaPlugin {

    BASE_URL = "https://mangasushi.net";
    NAME = "MangaSushi";
    TEST_QUERY = "Sukinako ga Megane wo Wasureta";

    async _getMangaPage(query: string): Promise<{ mangaTitle: string, mangaId: string }> {
        let searchJson: GenericObject;
        try {
            const res = await Scraper.post(`${this.BASE_URL}${API_ENDPOINT}`, RespBodyType.JSON,
                { body: { action: "wp-manga-search-manga", title: query } });
            searchJson = res.data as GenericObject;
        } catch (e) {
            throw new Error("An error occurred while searching");
        }

        if (!searchJson.success) {
            if (searchJson.data[0]?.error) {
                throw new Error("Could not find manga with the title");
            }
            throw new Error(searchJson.data[0].message);
        }

        let mangaTitle = searchJson.data[0].title;
        let mangaUrl = searchJson.data[0].url;

        const mangaRes = await Scraper.get(mangaUrl, RespBodyType.TEXT);

        if (!mangaRes.data) throw new Error("Failed to get manga page");
        let shortLink = Scraper.css(mangaRes.data as string, "link[rel=\"canonical\"]")
            .attr("href")!;

        let regexRes = /mangasushi\.net\/manga\/(.*?)\//.exec(shortLink);

        if (!regexRes || !regexRes[1]) throw new Error("Failed to get manga id.")

        let mangaId = regexRes[1];

        return { mangaTitle, mangaId };
    }

    async _getChapters(mangaId: string): Promise<Chapter[]> {
        const chapterRes = await Scraper.post(`${this.BASE_URL}/manga/${mangaId}/ajax/chapters`, RespBodyType.TEXT);

        if (!chapterRes.data || chapterRes.data == "0") throw new Error("Failed to get chapter page");
        let liChapters = Scraper.css(chapterRes.data as string, "ul li.wp-manga-chapter");

        let chapters: Chapter[] = [];
        liChapters.each((_: number, element: cheerio.Element) => {
            let aNode = Scraper.css(element, "a");

            let rawTitle = aNode.text();
            let cleanedTitle = rawTitle.replace(/[\n\t]/gm, "");
            cleanedTitle = /^ ?(.*?) ?$/.exec(cleanedTitle)![1];

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

    async getChaptersById(id: string): Promise<Chapter[]> {
        return await this._getChapters(id);
    }

    async selectChapter(chapter: Chapter): Promise<Reader> {
        let res = await Scraper.get(chapter.url!, RespBodyType.TEXT);

        if (!res.data) throw new Error("An error occurred while getting chapter page");

        let imgList = Scraper.css(res.data as string, "img[id*=\"image-\"]");
        //console.log(imgList);

        let imgURLs: Image[] = [];
        let digits = Math.floor(Math.log10(imgList.length)) + 1;
        imgList.each((i: number, element: any) => {
            let rawUrl = element.attribs['data-src'];
            let cleanedUrl = rawUrl.replace(/[\n\t]/gm, "");
            let extensionMatch = /\.(\w{3})($|\?\w+)/.exec(cleanedUrl);
            if (!extensionMatch) throw new Error("no extension");

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

    async getUpdateUrl(query: string): Promise<IDManga> {
        let { mangaTitle, mangaId } = await this._getMangaPage(query);
        let chapters = await this._getChapters(mangaId);

        return {
            title: mangaTitle,
            chapters: chapters,
            id: mangaId
        }
    }
}
