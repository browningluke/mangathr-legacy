import { Scraper } from "../scraper";
import { MangaPlugin, Chapter, Image, Reader, Manga, RSSManga } from "../types/plugin";
import { PLUGINS } from "./index";
import { pad } from "../helpers/plugins";

interface APIManga {
	alt_titles: string[],
	authors: string[],
	genres: string[],
	chapters: APIChapters[],
	title: string,
	series_id: string,
	description: string,
	status: string,
	cover_art: {
		source: string,
		width: number,
		height: number
	},
	all_covers: any[]
}

interface APIChapters {
	groups: any[],
	number: number,
	title?: string
}


class CatManga implements MangaPlugin {

	BASE_URL = "https://catmanga.org/";
	NAME = PLUGINS.CATMANGA;

	async _getApiManga(query: string, seriesId?: string): Promise<APIManga> {
		const resp = await Scraper.get(this.BASE_URL);
		const indexHTML = resp.body;

		if (!indexHTML) {
			throw "Failed to get index.html";
		}

		const APINode: any = Scraper.css(indexHTML, "script#__NEXT_DATA__");
		const indexJSONString = JSON.parse(APINode[0].children[0].data);
		const allSeries: APIManga[] = indexJSONString['props']['pageProps']['series'];

		const findManga = (): APIManga | undefined => {
			for (const element of allSeries) {
				if (seriesId) {
					if (seriesId == element["series_id"]) return element;
					continue;
				}

				if (fuzzySearch(query, element["title"]) ||
					fuzzySearch(query, element["series_id"])) return element;

				for (const title of element['alt_titles']) {
					if (fuzzySearch(query, title)) return element;
				}
			}
		};

		return findManga()!;
	}

	_getChapters(manga: APIManga): Chapter[] {
		let chapters: Chapter[] = [];
		manga["chapters"].forEach((chapter: APIChapters) => {
			let seriesID = manga["series_id"]
			let num = chapter.number;
			let title = `Chapter ${chapter.number}` + (chapter.title ? ` - ${chapter.title}` : "");

			chapters.push({ title: title, num: num, id: seriesID });
		});

		return chapters;
	}

	async getUpdateUrl(query: string): Promise<RSSManga> {
		const manga = await this._getApiManga(query);
		if (!manga) throw "Could not find manga.";

		return {
			id: manga.series_id, // can be id or url
			rss: false,
			title: manga.title,
			chapters: this._getChapters(manga).reverse()
		}
	}

	async getManga(query: string): Promise<Manga> {
		const manga = await this._getApiManga(query);
		if (!manga) throw "Could not find manga.";

		return {
			title: manga.title,
			chapters: this._getChapters(manga).reverse()
		}

	}

	async getChaptersById(id: string): Promise<Chapter[]> {
		const manga = await this._getApiManga("", id);
		return this._getChapters(manga).reverse();
	}

	async selectChapter(chapter: Chapter): Promise<Reader> {
		const mangaID = chapter.id!;
		const chapterNum = chapter.num;

		const chapterHTML = (await Scraper.get(`${this.BASE_URL}series/${mangaID}/${chapterNum}`)).body;

		if (!chapterHTML) throw "Could not get chapter HTML.";

		const APINode: any = Scraper.css(chapterHTML, "script#__NEXT_DATA__");
		const indexJSONString = JSON.parse(APINode[0].children[0].data);
		const buildId = indexJSONString['buildId'];

		const mangaURL = `${this.BASE_URL}_next/data/${buildId}/series/${mangaID}/${chapterNum}.json`;
		const mangaJsonString = (await Scraper.get(mangaURL)).body;

		if (!mangaJsonString) throw "Failed to load chapter.";

		const mangaJSON = JSON.parse(mangaJsonString);

		const imgList = mangaJSON["pageProps"]["pages"];

		let imgURLs: Image[] = [];
		const digits = Math.floor(Math.log10(imgList.length)) + 1;
		imgList.forEach((url: string, i: number) => {
			let extensionMatch = /\.(\w{3})($|\?\w+)/.exec(url);
			if (!extensionMatch) throw "no extension";
	
			imgURLs.push({
				filename: `${pad(i + 1, digits)}.${extensionMatch[1]}`,
				url: url,
			});
	
		});

		return {
			chapterTitle: chapter.title,
			urls: imgURLs,
			num: chapter.num
		}; 

	}
	
}

function fuzzySearch(query: string, trueString: string): boolean {
	return trueString.toLowerCase()
		.indexOf(query.toLowerCase()) !== -1;
}

export { CatManga };