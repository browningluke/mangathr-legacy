import { Scraper } from "../scraper";
import { MangaPlugin, Chapter, Image, Reader, Manga, RSSManga } from "../types/plugin";
import { PLUGINS } from "./index";
import { pad } from "../helpers/plugins";

const API_URL = "https://cubari.moe/read/api/"

class Cubari implements MangaPlugin {
	
	BASE_URL = "https://cubari.moe";
	NAME = PLUGINS.CUBARI;

	async _getMangaResp(query: string, api = false):
		Promise<{ manga: any, cubariType: string, mangaURL: string }> {

		let cubariType;
		let mangaURL;

		if (!api) {
			let cubariURLMatch = /\/read\/(\w+)\/(.+?)\//.exec(query);

			if (!cubariURLMatch) {
				throw new Error("Invalid Cubari URL.");
			}

			cubariType = cubariURLMatch![1]; // "imgur" or "gist"
			let mangaSlug = cubariURLMatch![2];
			mangaURL = API_URL + cubariType + "/series/" + mangaSlug + "/";
		} else {
			let cubariTypeMatch = /\/api\/(.+?)\//.exec(query)!;
			cubariType = cubariTypeMatch[1];
			mangaURL = query;
		}


		if (cubariType != "gist" && cubariType != "imgur") {
			throw new Error("Invalid Cubari URL.");
		}

		let mangaJSONString = (await Scraper.get(mangaURL)).body;

		if (!mangaJSONString) {
			throw new Error("Failed to get JSON data.");
		}

		let manga = JSON.parse(mangaJSONString);

		if (!manga) {
			throw new Error("Failed to get manga");
		}

		return { manga, cubariType, mangaURL };
	}

	_getChapters(manga: any, cubariType: string, mangaURL: string) {
		let mangaTitle = manga["title"];

		if (!mangaTitle) {
			throw new Error("Failed to get title of manga.");
		}

		let chapters: Chapter[] = [];

		if (cubariType == "gist") {
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
				if (!titleRaw.toLowerCase().includes("chapter") || !titleRaw.toLowerCase().includes("ch")) {
					title = `Chapter ${number} - ${titleRaw}`;
				}

				chapters.push({
					title: title,
					url: `${this.BASE_URL}${proxyURL}`,
					num: number,
					id: "gist"
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
				id: "imgur"
			});
		}

		// Sort chapters by chapter number
		chapters.sort((a, b) => a.num! - b.num!);

		return { chapters, mangaTitle };
	}

	async getUpdateUrl(query: string): Promise<RSSManga> {
		let { manga, cubariType, mangaURL } = await this._getMangaResp(query);
		let { chapters, mangaTitle } = await this._getChapters(manga, cubariType, mangaURL);

		return {
			title: mangaTitle,
			chapters: chapters.reverse(),
			rss: false,
			id: mangaURL
		}
	}

	async getManga(query: string, api?: boolean): Promise<Manga> {
		let { manga, cubariType, mangaURL } = await this._getMangaResp(query, api);
		let { chapters, mangaTitle } = await this._getChapters(manga, cubariType, mangaURL);

		return {
			chapters: chapters.reverse(), // Cubari sorts chapters oldest -> newest
			title: mangaTitle
		};
	}

	async getChaptersById(id: string): Promise<Chapter[]> {
		return (await this.getManga(id, true)).chapters;
	}

	async selectChapter(chapter: Chapter): Promise<Reader> {
		const resp = await Scraper.get(chapter.url!);
		const cubariType = chapter.id!;

		const body = JSON.parse(resp.body);

		const pages = cubariType == "imgur" ? body.chapters[1].groups[1] : body;

		let imgURLs: Image[] = [];
		const digits = Math.floor(Math.log10(pages.length)) + 1;
		pages.forEach((element: any, i: number) => {
			const url = element["src"];
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

export { Cubari };