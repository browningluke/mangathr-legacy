import { SQLite } from "./databases/sqlite";

import { handleDialog, initCommands } from "./commands";
import { Database } from "./types/database";

import { Command as Commander } from 'commander';
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
		.action(async () => {
			await handleDialog(db);
		});

	initCommands(program, db);
	program.parse(process.argv);
}

export const shutdown = async () => {
	console.log("\rStopping...");
	process.exit();
}

process.on('SIGINT', () => {
	shutdown().then();
});

process.on('exit', () => {
	db.close().then();
})