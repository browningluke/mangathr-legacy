import { SQLite } from "@databases/sqlite";

import { handleDialog, initCommands } from "./commands";
import { Database } from "database";

import { Command as Commander } from 'commander';
import { ALL_PLUGIN_NAMES } from "./plugins";
const program = new Commander();

const db = new SQLite();

export async function run() {
	try {
		await db.setup();
	} catch (err) {
		console.error(err);
		return;
	}

	handleArgsNew(db);
}
function handleArgsNew(db: Database) {
	program
		.description("A CLI utility to download manga chapters from various online platforms.")
		.option('--list-plugins', "prints all available plugin names")
		.action(async (option) => {
			switch (true) {
				case option.listPlugins:
					console.log("\x1b[1m", "Installed Plugins are:", "\x1b[0m");
					ALL_PLUGIN_NAMES.map((name) => console.log(` - ${name}`));
					return;
			}

			await handleDialog(db);
		});

	initCommands(program, db);
	program.parse(process.argv);
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