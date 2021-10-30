import { GenericObject, RespBodyType, Scraper } from "@core/scraper";
import { Chapter, IDManga, Image, Manga, MangaPlugin, Reader}  from "plugin";
import { pad, fuzzySearch } from "@helpers/plugins";

interface APIBaseManga {
	alt_titles: string[],
	authors: string[],
	genres: string[],
	title: string,
	series_id: string,
	description: string,
	status: string,
	cover_art: {
		source: string,
		width: number,
		height: number
	}
}

interface APIIndexManga extends APIBaseManga {
	chapter_text: string,
	groups: string[]
}

interface APIManga extends APIBaseManga {
	chapters: APIChapters[],
	all_covers: {
		source: string,
		width: number,
		height: number
	}[]
}

interface APIChapters {
	groups: string[],
	number: number,
	title?: string
}


export default class CatManga implements MangaPlugin {

	BASE_URL = "https://catmanga.org/";
	NAME = "Catmanga";
	TEST_QUERY = "komi";
	buildId: string | undefined;

	private async setBuildIdFromIndex() {
		const resp = await Scraper.get(this.BASE_URL, RespBodyType.TEXT);
		const indexHTML = resp.data as string;

		if (!indexHTML) {
			throw Error("Failed to get index.html");
		}

		const APINode: any = Scraper.css(indexHTML, "script#__NEXT_DATA__");
		const indexJSONString = JSON.parse(APINode[0].children[0].data);

		this.buildId = indexJSONString['buildId'];
	}

	private async getBuildIdFromChapter(mangaID: string, chapterNum: number) {
		const resp = await Scraper.get(`${this.BASE_URL}series/${mangaID}/${chapterNum}`,
			RespBodyType.TEXT);
		const chapterHTML = resp.data as string;

		if (!chapterHTML) throw Error("Could not get chapter HTML.");

		const APINode: any = Scraper.css(chapterHTML, "script#__NEXT_DATA__");
		const indexJSONString = JSON.parse(APINode[0].children[0].data);
		return indexJSONString['buildId'];
	}

	private async _getApiManga(query: string, seriesId?: string): Promise<APIManga> {

		if (!this.buildId) await this.setBuildIdFromIndex();

		let indexJSON: GenericObject;
		try {
			const resp = await Scraper.get(`${this.BASE_URL}_next/data/${this.buildId}/index.json`,
				RespBodyType.JSON);
			indexJSON = resp.data as GenericObject;
		} catch (e) {
			throw Error("Failed to get index information.");
		}

		const allSeries: APIIndexManga[] = indexJSON['pageProps']['series'];

		const findManga = (): APIIndexManga | undefined => {
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

		let manga = findManga()!;

		let mangaJSON: APIManga;
		try {
			const resp =
				await Scraper.get(`${this.BASE_URL}_next/data/${this.buildId}/series/${manga.series_id}.json`,
				RespBodyType.JSON);
			mangaJSON = (resp.data as GenericObject)['pageProps']['series'] as APIManga;
		} catch (e) {
			throw Error("Failed to get index information.");
		}

		return mangaJSON;
	}

	private _getChapters(manga: APIManga): Chapter[] {
		let chapters: Chapter[] = [];
		manga["chapters"].forEach((chapter: APIChapters) => {
			let seriesID = manga["series_id"]
			let num = chapter.number;
			let title = `Chapter ${chapter.number}` + (chapter.title ? ` - ${chapter.title}` : "");

			chapters.push({ title: title, num: num, id: seriesID });
		});

		return chapters;
	}

	async getUpdateUrl(query: string): Promise<IDManga> {
		const manga = await this._getApiManga(query);
		if (!manga) throw "Could not find manga.";

		return {
			id: manga.series_id, // can be id or url
			title: manga.title,
			chapters: this._getChapters(manga)
		}
	}

	async getManga(query: string): Promise<Manga> {
		const manga = await this._getApiManga(query);
		if (!manga) throw "Could not find manga.";

		return {
			title: manga.title,
			chapters: this._getChapters(manga)
		}

	}

	async getChaptersById(id: string): Promise<Chapter[]> {
		const manga = await this._getApiManga("", id);
		return this._getChapters(manga);
	}

	async selectChapter(chapter: Chapter): Promise<Reader> {

		const getMangaJSON = async (buildId: string) => {
			const mangaURL = `${this.BASE_URL}_next/data/${buildId}/series/${mangaID}/${chapterNum}.json`;

			let mangaJSON: GenericObject;
			try {
				const resp = await Scraper.get(mangaURL, RespBodyType.JSON);
				mangaJSON = resp.data as GenericObject;
			} catch (e) {
				throw Error("Failed to parse manga JSON.");
			}

			if (mangaJSON && Object.keys(mangaJSON).length == 0 && mangaJSON.constructor == Object)
				throw Error("Failed to load chapter.");

			return mangaJSON;
		}

		const mangaID = chapter.id!;
		const chapterNum = chapter.num;

		if (!this.buildId) await this.setBuildIdFromIndex();

		let mangaJSON;
		try {
			mangaJSON = await getMangaJSON(this.buildId!);
		} catch (e) {
			let buildId = await this.getBuildIdFromChapter(mangaID, chapterNum);
			mangaJSON = await getMangaJSON(buildId);
		}

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
