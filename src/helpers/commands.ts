import { Plugins } from "../plugins";
import { generateTable, readLineAsync } from "./cli";
import { Chapter, MangaPlugin } from "../types/plugin";
import { downloadChapter } from "../downloader";

async function searchQuery(plugin: MangaPlugin, register: boolean, argQuery?: string) {
    if (!argQuery) process.stdout.write(`(${plugin.NAME}) Enter manga title: `);
    let query = argQuery ?? await readLineAsync();
    console.log("Query " + query);

    return register ? await Plugins.getUpdateUrl(query, plugin) : await Plugins.getManga(query, plugin)!;
}

async function download(chapter: Chapter, mangaTitle: string, plugin: MangaPlugin, quiet?: boolean) {
    if (!quiet) console.log(`Downloading: ${chapter.title}`);
    let reader = await Plugins.selectChapter(chapter, plugin)!;

    await downloadChapter(reader, mangaTitle, Plugins.getRefererUrl(plugin), quiet);
}

async function printTableAndMessage(chapters: Chapter[], mangaTitle: string, numManga: number) {
    let table = await generateTable(chapters, mangaTitle);
    console.log(`${table.toString()}\nTitle: ${mangaTitle}\nNumber of chapters: ${numManga}`);
}

export { searchQuery, printTableAndMessage, download };