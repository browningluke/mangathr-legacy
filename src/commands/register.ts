import { MangaPlugin } from "../types/plugin";
import { Database } from "../types/database";
import { MangaAlreadyRegisteredError } from "../exceptions";
import { printTableAndMessage, searchQuery, selectPlugin } from "../helpers/commands";
import { getUserConfirmation } from "../helpers/cli";
import { RSSManga } from "../types/plugin";
import { MangaUpdate } from "../types/database";

export async function handleRegisterDialog(db: Database) {
	let plugin = await selectPlugin();
	let manga = await getManga(plugin);

	await printTableAndMessage(manga.chapters, manga.title, manga.chapters.length);
	console.log((manga as RSSManga).id);

	await registerManga(db, manga, plugin);
}

async function getManga(plugin: MangaPlugin, query?: string): Promise<RSSManga> {
	let	mangaUnion = await searchQuery(plugin, true, query);
	return mangaUnion as RSSManga;
}

async function registerManga(db: Database, manga: RSSManga, plugin: MangaPlugin, skipConfirmation = false) {
	console.log(`Registering: ${manga.title}`);

	if (!skipConfirmation && await getUserConfirmation(
		`Are you sure you want to register this manga? (y/n): `) == "n") {
		return;
	}

	let chapterNumberArray: number[] = [];
	manga.chapters.forEach((chapter) => {
		//if (isDownloaded(manga.title, chapter.title, chapter.num))
		chapterNumberArray.push(chapter.num!);
	})

	let mangaUpdate: MangaUpdate = {
		plugin: plugin.NAME,
		title: manga.title,
		id: manga.id,
		chapters: chapterNumberArray
	}

	await addToDatabase(db, mangaUpdate);
}

async function addToDatabase(db: Database, mangaUpdate: MangaUpdate) {
    try {
        await db.registerManga(mangaUpdate);
        console.log("Manga registered!");
    } catch (err) {
        if (err.name == MangaAlreadyRegisteredError.name) {
            console.log("Manga has already been registered.")
        } else {
            console.error(err);
        }
    }
}
