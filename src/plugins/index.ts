import { MangaPlugin } from "plugin";

// Plugins
import Webtoons from "./webtoons";
import CatManga from "./catmanga";
import Cubari from "./cubari";
import MangaSushi from "./mangasushi";
import Mangakakalot from "./mangakakalot";
import MangaDex from "./mangadex";
import Guya from "./guya";
import MangaPlus from "./mangaplus";

// Generate a map at runtime
const pluginsList = [new Webtoons, new CatManga, new Cubari, new MangaDex, new MangaSushi, new Mangakakalot,
					 new Guya, new MangaPlus];
export const ALL_PLUGIN_NAMES = pluginsList.map((a) => a.NAME);

// Since TS types don't exist in the transpiled code, we can't define the type as:
// { string: MangaPlugin }
// since the object is generated at runtime. Instead we assign it type of 'any' and
// handle the type guarding with the `getPlugin` method.
const pluginMap: any = pluginsList.reduce((a, b) => {
	// @ts-ignore
	a[b.NAME.toLowerCase()] = b;
	return a;
}, {});

export function getPluginFromMap(name: string): MangaPlugin | undefined {
	return pluginMap[name.toLowerCase()];
}
