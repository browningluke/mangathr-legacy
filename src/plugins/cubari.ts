import { Scraper } from "@core/scraper";
import { MangaPlugin, Chapter, Image, Reader, Manga, RSSManga } from "plugin";
import { pad } from "@helpers/plugins";

const API_URL = "https://cubari.moe/read/api/"

enum CubariType {
	IMGUR = "imgur",
	MANGADEX = "mangadex",
	GIST = "gist"
}

export default class Cubari implements MangaPlugin {
	
	BASE_URL = "https://cubari.moe";
	NAME = "Cubari";
	TEST_QUERY = "https://cubari.moe/read/gist/JOqMO/69/1/";

	async _getMangaResp(query: string, api = false, apiType?: CubariType):
		Promise<{ manga: any, cubariType: CubariType, mangaURL: string }> {

		let cubariType: CubariType;
		let mangaURL;

		if (!api) {
			let cubariURLMatch = /\/read\/(\w+)\/(.+?)\//.exec(query);
			let mangadexURLMatch = /mangadex\.org\/title\/(.+)/.exec(query);

			let mangaSlug: string;
			if (cubariURLMatch) {
				let rawCubariType = cubariURLMatch![1]; // "imgur" or "gist"
				cubariType = rawCubariType as CubariType;
				mangaSlug = cubariURLMatch![2];

			} else if (mangadexURLMatch) {
				cubariType = CubariType.MANGADEX;
				mangaSlug = mangadexURLMatch![1];

			} else {
				throw new Error("Invalid Cubari URL.");
			}

			mangaURL = API_URL + cubariType + "/series/" + mangaSlug + "/";
		} else {
			cubariType = apiType!;
			mangaURL = `${API_URL}${apiType}/series/${query}/`;
		}

		let mangaJSONResp = await Scraper.get(mangaURL);
		if (mangaJSONResp.status_code != 200) throw Error("Failed to get manga information.");
		let mangaJSONString = mangaJSONResp.body;

		if (!mangaJSONString) {
			throw new Error("Failed to get JSON data.");
		}

		let manga = JSON.parse(mangaJSONString);

		if (!manga) {
			throw new Error("Failed to get manga");
		}

		return { manga, cubariType, mangaURL };
	}

	_getChapters(manga: any, cubariType: CubariType, mangaURL: string) {
		let mangaTitle = manga["title"];

		if (!mangaTitle) {
			throw new Error("Failed to get title of manga.");
		}

		let chapters: Chapter[] = [];

		if (cubariType == CubariType.GIST || cubariType == CubariType.MANGADEX) {
			let chapterIndexAsArray = Object.keys(manga["chapters"]); // Since manga.chapters is an obj.
			chapterIndexAsArray.forEach((index) => {
				const chapter = manga["chapters"][index];
				const groups = chapter.groups;
				let groupFirstKey = Object.keys(groups)[0]; // Get first (and most likely only) group url.
				let proxyURL = groups[groupFirstKey];

				let numberMatch = /[cC]h(apter)? ?(\d+(\.\d+)?)(.*)/.exec(chapter.title);
				let number = numberMatch ? parseFloat(numberMatch[2]) : parseFloat(index);

				let titleRaw = chapter["title"];
				let title = titleRaw;

				// Check for empty or null titles
				if (titleRaw == null || titleRaw == "") {
					title = `Chapter ${number}`
				} else if (!titleRaw.toLowerCase().includes("chapter") ||
					!titleRaw.toLowerCase().includes("ch")) {

					title = `Chapter ${number} - ${titleRaw}`;
				}

				chapters.push({
					title: title,
					url: `${this.BASE_URL}${proxyURL}`,
					num: number,
					id: cubariType
				});
			});
		} else {
			let titleRegex = /( ?- ?)? ?[Cc]h(apter| |\.)? ?(\d+(\.\d+)?)((( ?- ?)|:| )? ?(.*))/;
			let titleMatch = titleRegex.exec(mangaTitle);
			let chapterNum = titleMatch ? parseFloat(titleMatch[3]!) : 1;

			mangaTitle = manga.title.replace(titleRegex, "");

			let chapterTitle = `Chapter ${chapterNum}` + (titleMatch && titleMatch[8] ? ` - ${titleMatch[8]}` : "");

			chapters.push({
				title: chapterTitle,
				url: mangaURL,
				num: chapterNum,
				id: CubariType.IMGUR
			});
		}

		// Sort chapters by chapter number
		chapters.sort((a, b) => a.num! - b.num!);

		return { chapters, mangaTitle };
	}

	async getUpdateUrl(query: string): Promise<RSSManga> {
		let { manga, cubariType, mangaURL } = await this._getMangaResp(query);

		if (cubariType == CubariType.IMGUR) throw new Error("Registering not supported for Imgur chapters.");

		let { chapters, mangaTitle } = await this._getChapters(manga, cubariType, mangaURL);

		let idMatch = /\/series\/(.*)\//.exec(mangaURL);
		if (!idMatch) throw new Error("Failed to get manga ID.");
		let id = `${cubariType}~${idMatch[1]}`;

		return {
			title: mangaTitle,
			chapters: chapters.reverse(),
			rss: false,
			id: id
		}
	}

	async getManga(query: string, api?: boolean, apiType?: CubariType): Promise<Manga> {
		let { manga, cubariType, mangaURL } = await this._getMangaResp(query, api, apiType);
		let { chapters, mangaTitle } = await this._getChapters(manga, cubariType, mangaURL);

		return {
			chapters: chapters.reverse(), // Cubari sorts chapters oldest -> newest
			title: mangaTitle
		};
	}

	async getChaptersById(id: string): Promise<Chapter[]> {
		let x = /(.*)~(.*)/.exec(id);
		let rawCubariType = x![1];
		let mangaId = x![2];
		let cubariType: CubariType = rawCubariType as CubariType;

		return (await this.getManga(mangaId, true, cubariType)).chapters;
	}

	async selectChapter(chapter: Chapter): Promise<Reader> {
		const resp = await Scraper.get(chapter.url!);
		const rawCubariType = chapter.id!;
		const cubariType = rawCubariType as CubariType;

		const body = JSON.parse(resp.body);

		const pages = cubariType == CubariType.IMGUR ? body.chapters[1].groups[1] : body;

		let imgURLs: Image[] = [];
		const digits = Math.floor(Math.log10(pages.length)) + 1;
		pages.forEach((element: any, i: number) => {
			const url = cubariType == CubariType.MANGADEX ? element : element["src"];
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
		}
	}

}
