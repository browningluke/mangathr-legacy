import { Plugins, PLUGINS } from "./plugins";
import { Mongo } from "./databases/mongo";

import { Command, handleDownloadDialog } from "./commands";
import { MangaPlugin } from "./types/plugin";

const cliSelect = require('cli-select');

const db = new Mongo();

/*
	Selections
*/

async function selectCommand(): Promise<Command> {
	const selectedModeResp = await cliSelect({values: Object.values(Command)});
	return selectedModeResp.value;
}

async function selectPlugin(): Promise<MangaPlugin> {
	let selectedPluginResp = await cliSelect({values: Plugins.PLUGIN_NAMES});
	let selectedPlugin: PLUGINS = selectedPluginResp.value;

	let plugin: MangaPlugin;
	try {
		plugin = Plugins.PLUGINS[selectedPlugin];
	} catch (error) {
		console.error("Could not find plugin!");
		throw error;
	}

	return plugin;
}

/*
	Handle Commands
*/

async function handleCommandSelection(command: Command) {
	const plugin = await selectPlugin();

	switch (command) {
		case Command.Download:
			await handleDownloadDialog(db, plugin);
			break
		default:
			throw "Selected mode not in enum. (This should never happen)"
	}
	return;
}

async function run() {
	try {
		await db.setup();
	} catch (err) {
		console.error(err);
		return;
	}

	const mode = await selectCommand();

	await handleCommandSelection(mode)
		.finally(async () => db.close());
}

function main() {
	run().then();
}

main();