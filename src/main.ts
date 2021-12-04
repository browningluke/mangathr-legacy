import SQLite from "@databases/sqlite";
import Config from "@core/config";

import { handleDialog, initCommands } from "./commands";

import { Command as Commander } from 'commander';
import { ALL_PLUGIN_NAMES } from "./plugins";
const program = new Commander();

let db = new SQLite();

export async function run() {
	program
		.description("A CLI utility to download manga chapters from various online platforms.")
		.addHelpText('after', `\nExample:\n    $ mangathr --help`)
		.hook('preAction', async (thisCommand, actionCommand) => {
			await db.setup()

			const commandName = actionCommand.name();
			if (commandName == "download" || commandName == "update") { Config.CONFIG.setDestDir(commandName); }
		} );

	program
		.option('--db-path <path>', "specify path to database",
			(v: string) => Config.CONFIG.SQLITE_STORAGE = v)
		.option('--dest <path>', "specify path to save files",
			(v: string) => Config.CONFIG.setDestDir("override", v))
		.option('--no-comic-info', "disables adding ComicInfo to archive",
			(_) => Config.CONFIG.INCLUDE_COMIC_INFO = false);

	program
		.option('--list-plugins', "prints all available plugin names", async (_) => {
			console.log("\x1b[1m", "Installed Plugins are:", "\x1b[0m");
			ALL_PLUGIN_NAMES.map((name) => console.log(` - ${name}`));
			await shutdown(true);
		})
		.action(async _ => await handleDialog(db));

	initCommands(program, db);
	await program.parseAsync(process.argv);
}

export const shutdown = async (q = false) => {
	if (!q) console.log("\rStopping...");
	process.exit();
}

process.on('SIGINT', () => {
	shutdown().then();
});

process.on('exit', () => {
	db.close().then();
})