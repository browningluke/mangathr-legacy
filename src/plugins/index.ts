import { MangaPlugin, Chapter, Reader, Manga } from "../types/plugin";
import { Webtoons } from "./webtoons";
import { CatManga } from "./catmanga";
import { Cubari } from "./cubari";
import { MangaSushi } from "./mangasushi";
import { Mangakakalot } from "./mangakakalot";
import { MangaDex } from "./mangadex";

enum PLUGINS {
	WEBTOONS = "Webtoons",
	CATMANGA = "Catmanga",
	CUBARI = "Cubari",
	MANGASUSHI = "MangaSushi",
	MANGAKAKALOT = "Mangakakalot",
	MANGADEX = "MangaDex"
}

class Plugins {

	static WEBTOONS = new Webtoons();
	static CATMANGA = new CatManga();
	static CUBARI = new Cubari();
	static MANGASUSHI = new MangaSushi();
	static MANGAKAKALOT = new Mangakakalot();
	static MANGADEX = new MangaDex();

	static PLUGINS = {
		"Webtoons": Plugins.WEBTOONS,
		"Catmanga": Plugins.CATMANGA,
		"Cubari": Plugins.CUBARI,
		"MangaSushi": Plugins.MANGASUSHI,
		"Mangakakalot": Plugins.MANGAKAKALOT,
		"MangaDex": Plugins.MANGADEX
	};
	static PLUGIN_NAMES = Object.keys(Plugins.PLUGINS);

	static getManga(query: string, plugin: MangaPlugin): Promise<Manga> | undefined {
		return plugin.getManga(query);
	}

	static selectChapter(chapter: Chapter, plugin: MangaPlugin): Promise<Reader> | undefined {
		return plugin.selectChapter(chapter);
	}

	static getRefererUrl(plugin: MangaPlugin): string | undefined {
		return plugin.BASE_URL;
	}

	static getUpdateUrl(query: string, plugin: MangaPlugin) {
		return plugin.getUpdateUrl(query);
	}

	static getChaptersById(id: string, plugin: MangaPlugin) {
		return plugin.getChaptersById(id);
	}

}

export { Plugins, PLUGINS };