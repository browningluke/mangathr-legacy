import { ALL_PLUGIN_NAMES, getPluginFromMap } from "../plugins";
import { generateTable, getUserSelection, readLineAsync } from "./cli";
import { Chapter, Manga, MangaPlugin } from "../types/plugin";
import { downloadChapter, isDownloaded } from "../downloader";
import { shutdown } from "../main";

async function searchQuery(plugin: MangaPlugin, register: boolean, argQuery?: string) {
    if (!argQuery) process.stdout.write(`(${plugin.NAME}) Enter manga title: `);
    let query = argQuery ?? await readLineAsync();
    console.log("Query " + query);

    let manga: Manga
    try {
        manga = register ? await plugin.getUpdateUrl(query) : await plugin.getManga(query);
    } catch (e) {
        console.log(`An error occurred, shutting down. (${e.message})`);
        await shutdown(true);
    }

    return manga!;
}

async function download(chapter: Chapter, mangaTitle: string, plugin: MangaPlugin, quiet?: boolean) {
    if (!quiet) console.log(`Downloading: ${chapter.title}`);

    if (isDownloaded(mangaTitle, chapter.title, chapter.num)) {
        console.log(`Skipping ${chapter.title}, already downloaded.`);
        return;
    }

    let reader = await plugin.selectChapter(chapter);

    try {
        await downloadChapter(reader, mangaTitle, plugin.BASE_URL, quiet);
    } catch (e) {
        console.log(`Error. Download failed. (${e.message})`);
    }
}

async function printTableAndMessage(chapters: Chapter[], mangaTitle: string, numManga: number) {
    let table = await generateTable(chapters, mangaTitle);
    console.log(`${table.toString()}\nTitle: ${mangaTitle}\nNumber of chapters: ${numManga}`);
}

async function parsePlugin(plugin: string): Promise<MangaPlugin> {
    let parsedPlugin = getPluginFromMap(plugin);

    if (!parsedPlugin) {
        console.log("Plugin not recognized, please select plugin.");
        parsedPlugin = await selectPlugin();
    }

    return parsedPlugin;
}

async function selectPlugin(): Promise<MangaPlugin> {
    let selectedPluginResp = await getUserSelection(Object.values(ALL_PLUGIN_NAMES));

    let plugin = getPluginFromMap(selectedPluginResp);

    if (!plugin) {
        throw new Error("Could not find plugin!");
    }

    return plugin;
}

export { searchQuery, printTableAndMessage, download, parsePlugin, selectPlugin };