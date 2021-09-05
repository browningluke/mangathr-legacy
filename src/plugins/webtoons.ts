import { Scraper } from "@core/scraper";
import { MangaPlugin, Chapter, Image, Reader, Manga, RSSManga } from "plugin";
import { pad } from "@helpers/plugins";

const SEARCH_URL = "https://ac.webtoons.com/ac?q=en%5E";
const SEARCH_PARAMS = "&q_enc=UTF-8&st=1&r_format=json&r_enc=UTF-8";
const LIST_ENDPOINT = "/episodeList?titleNo=";

export default class Webtoons implements MangaPlugin {
	
	BASE_URL = "https://m.webtoons.com";
	NAME = "Webtoons";
	
	private async _getMangaPage(query: string, url?: boolean): Promise<{ body: string, urlLocation: string }> {
		let urlLocation = query;

		if (!url) {
			const searchURL = `${SEARCH_URL}${encodeURI(query)}${SEARCH_PARAMS}`;

			let searchJson: any;
			try {
				const searchResp = await Scraper.get(searchURL);
				searchJson = JSON.parse(searchResp.body);
			} catch (error) {
				throw new Error("Failed to get chapter with that title.");
			}

			if (searchJson["items"].length == 0) throw new Error("Could not find a webtoon with that title.");

			let mangaID = '';
			for (const element of searchJson['items'][0]) {
				if (element[1][0] == "TITLE") {
					mangaID = element[3][0];
				}
			}

			if (!mangaID) throw new Error("Could not find a webtoon with that title.");

			urlLocation = this.BASE_URL + LIST_ENDPOINT + mangaID;
		}

		const resp = await Scraper.get(urlLocation,
			undefined, true,
			{ headers: { cookie: "pagGDPR=true", referer: this.BASE_URL } });

		return { body: resp.body, urlLocation: urlLocation };
	}

	private _getChapters(body: string): Chapter[] {
		const liChapters = Scraper.css(body, "ul#_episodeList li[id*=episode]");

		let chapters: Chapter[] = [];
		liChapters.each((i: number, element: cheerio.Element) => {
			const url = Scraper.css(element, "a").attr("href")!;

			const title = Scraper.css(element, ".ellipsis").text();
			const num = Scraper.css(element, ".col.num").text().substring(1);

			// console.log(`${i} ` + url);
			// console.log(`${i} ` + title);
			// console.log(`${i} ` + num);
	
			chapters.push({
				title: title,
				url: url,
				num: parseInt(num)
			});
	
		});

		return chapters;
	}

	async getUpdateUrl(query: string): Promise<RSSManga> {
		const { body, urlLocation } = await this._getMangaPage(query);
		const chapterTitleNode = Scraper.css(body, 'meta[property="og:title"]');
		const chapterTitle = chapterTitleNode.attr("content")!;

		return {
			title: chapterTitle,
			chapters: this._getChapters(body),
			rss: false,
			id: urlLocation
		}
	}

	async getManga(query: string): Promise<Manga> {
		const { body } = await this._getMangaPage(query);
		const chapterTitleNode = Scraper.css(body, 'meta[property="og:title"]');
		const chapterTitle = chapterTitleNode.attr("content")!;

		return {
			title: chapterTitle,
			chapters: this._getChapters(body),
		};
	}

	async getChaptersById(id: string): Promise<Chapter[]> {
		const { body } = await this._getMangaPage(id, true);
		return this._getChapters(body);
	}

	async selectChapter(chapter: Chapter): Promise<Reader> {
		const resp = await Scraper.get(chapter.url!, undefined, true,
			{ headers: { cookie: "pagGDPR=true" } });

		//var titleNode = mango.css(resp.body, ".subj_info .subj_episode").text();
		const imgList = Scraper.css(resp.body, "#_imageList img");

		let imgURLs: Image[] = [];
		const digits = Math.floor(Math.log10(imgList.length)) + 1;
		imgList.each((i: number, element: any) => {
			const url = element.attribs["data-url"];
			let extensionMatch = /\.(\w{3})($|\?\w+)/.exec(url);
			if (!extensionMatch) throw new Error("Chapter image has no extension.");
	
			imgURLs.push({
				filename: `${pad(i + 1, digits)}.${extensionMatch[1]}`,
				url: url,
			});
	
		});
	
		return {
			chapterTitle: chapter.title,
			urls: imgURLs,
			num: chapter.num
		}
	}

}
