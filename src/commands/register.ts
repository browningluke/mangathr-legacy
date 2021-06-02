import { MangaPlugin } from "../types/plugin";
import { Database } from "../types/database";
import { MangaAlreadyRegisteredError } from "../exceptions";
import { printTableAndMessage, searchQuery } from "../helpers/commands";
import { getUserConfirmation } from "../helpers/cli";
import { RSSManga } from "../types/plugin";
import { MangaUpdate } from "../types/database";


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

async function handleRegisterDialog(db: Database, plugin: MangaPlugin, query?: string) {

	let mangaUnion;
	try {
		mangaUnion = await searchQuery(plugin, true, query);
	} catch (e) {
		console.log(e.message);
		return;
	}

	let manga = mangaUnion as RSSManga;

	await printTableAndMessage(manga.chapters, manga.title, manga.chapters.length);
	console.log((manga as RSSManga).id);

	if (await getUserConfirmation(`Are you sure you want to register this manga? (y/n): `) == "n") {
		return;
	}

	console.log(`Registering: ${manga.title}`);

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

export { handleRegisterDialog };