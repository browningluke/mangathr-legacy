import { MangaPlugin, Chapter, Reader, Manga } from "../types/plugin";
import { Webtoons } from "./webtoons";
import { CatManga } from "./catmanga";

enum PLUGINS {
	WEBTOONS = "Webtoons",
	CATMANGA = "Catmanga",
}

class Plugins {

	static WEBTOONS = new Webtoons();
	static CATMANGA = new CatManga();
	static PLUGINS = {
		"Webtoons": Plugins.WEBTOONS,
		"Catmanga": Plugins.CATMANGA,
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