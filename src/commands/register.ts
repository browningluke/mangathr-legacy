import { MangaPlugin, IDManga } from "plugin";
import { Database, MangaUpdate } from "database";
import { MangaAlreadyRegisteredError } from "@core/exceptions";
import { parsePlugin, printTableAndMessage, searchQuery, selectPlugin } from "@helpers/commands";
import { getUserConfirmation } from "@helpers/cli";

import { Command as Commander } from "commander";

export function initRegisterCommand(program: Commander, db: Database) {
	const registerFunction = async (plugin: string, query: string, options: any) => {
		let parsedPlugin = await parsePlugin(plugin);
		let manga = await getManga(parsedPlugin, query);

		if (!options.y) {
			await printTableAndMessage(manga.chapters, manga.title, manga.chapters.length);
			console.log((manga as IDManga).id);
		}

		await registerManga(db, manga, parsedPlugin, options.y);
	}

	program
		.command(`register <plugin> <query>`)
		.alias('r')
		.description("register manga to database for new chapter checking")
		.option('-y', 'skip user confirmation')
		.action(registerFunction);
}

export async function handleRegisterDialog(db: Database) {
	let plugin = await selectPlugin();
	let manga = await getManga(plugin);

	await printTableAndMessage(manga.chapters, manga.title, manga.chapters.length);
	console.log((manga as IDManga).id);

	await registerManga(db, manga, plugin);
}

async function getManga(plugin: MangaPlugin, query?: string): Promise<IDManga> {
	let	mangaUnion = await searchQuery(plugin, true, query);
	return mangaUnion as IDManga;
}

async function registerManga(db: Database, manga: IDManga, plugin: MangaPlugin, skipConfirmation = false) {
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
		if (typeof err === "string") {
			console.error(err);
		} else if (err instanceof Error) {
			if (err.name == MangaAlreadyRegisteredError.name) {
				console.log("Manga has already been registered.")
			} else {
				console.error(err);
			}
		}
	}
}
