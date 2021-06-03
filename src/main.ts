import { Plugins, PLUGINS } from "./plugins";
import { Mongo } from "./databases/mongo";

import { Command, handleDownloadDialog, handleListDialog,
	handleRegisterDialog, handleUpdateDialog } from "./commands";
import { MangaPlugin } from "./types/plugin";
import { getUserSelection } from "./helpers/cli";

import { ArgumentParser } from 'argparse';

const parser = new ArgumentParser({
	description: 'Manga Downloader'
});

const db = new Mongo();

/*
	Selections
*/

async function selectCommand(): Promise<Command> {
	return getUserSelection(Object.values(Command));
}

async function selectPlugin(): Promise<MangaPlugin> {
	let selectedPluginResp = await getUserSelection(Object.values(PLUGINS));

	let plugin: MangaPlugin;
	try {
		plugin = Plugins.PLUGINS[selectedPluginResp];
	} catch (error) {
		console.error("Could not find plugin!");
		throw error;
	}

	return plugin;
}

/*
	Handle Commands
*/

async function handleCommandSelection(command: Command, argPlugin?: MangaPlugin, query?: string) {
	switch (command) {
		case Command.List:
			await handleListDialog(db);
			return;
		case Command.Update:
			await handleUpdateDialog(db);
			return;
	}

	const plugin = argPlugin ?? await selectPlugin();

	switch (command) {
		case Command.Download:
			await handleDownloadDialog(db, plugin, query);
			break
		case Command.Register:
			await handleRegisterDialog(db,plugin, query);
			break
		default:
			throw "Selected mode not in enum. (This should never happen)"
	}
	return;
}

async function run(argMode?: Command, argPlugin?: MangaPlugin, query?: string) {
	try {
		await db.setup();
	} catch (err) {
		console.error(err);
		return;
	}

	const mode = argMode ?? await selectCommand();

	await handleCommandSelection(mode, argPlugin, query)
		.finally(async () => db.close());
}


function handleArgs():
	{ mode: Command | undefined, plugin: MangaPlugin | undefined, query: string | undefined } {

	function _enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
		return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
	}

	for (const key of _enumKeys(Command)) {
		const m = Command[key];
		const firstLetter = m.slice(0, 1);
		parser.add_argument(`-${firstLetter}`, {action: 'store_const', const: key });
	}

	parser.add_argument('-p', { help: 'specify plugin to use.' });
	parser.add_argument('-q', { help: 'specify query to search.' });

	let args = parser.parse_args();

	let mode: Command | undefined;
	for (const key of _enumKeys(Command)) {
		const m = Command[key];
		const firstLetter = m.slice(0, 1);

		if (args[firstLetter]) {
			if (mode) {
				console.log("Cannot select multiple commands.");
				process.exit(0);
			}
			mode = Command[key];
		}
	}

	let plugin: MangaPlugin | undefined;
	for (let [key, plug] of Object.entries(Plugins.PLUGINS)) {
		if (args['p'] && args['p'].toLowerCase() == key.toLowerCase()) {
			plugin = plug;
			break;
		}
	}

	let query = args['q'];

	return { mode: mode, plugin: plugin, query: query };
}

function main() {
	const { mode, plugin, query } = handleArgs();
	run(mode, plugin, query).then();
}

export const shutdown = () => {
	console.log("\nStopping...");

	db.close().then().finally(() => process.exit());
}

process.on('SIGINT', shutdown);

main();