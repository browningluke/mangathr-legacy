import { handleListDialog } from "./list";
import { handleDownloadDialog } from "./download";
import { handleRegisterDialog } from "./register";
import { handleUpdateDialog } from "./update";

import { Database } from "../types/database";
import { MangaPlugin } from "../types/plugin";

import { getUserSelection } from "../helpers/cli";

const Commands = {
    'download': handleDownloadDialog,
    'register': handleRegisterDialog,
    'list': handleListDialog,
    'update': handleUpdateDialog
}

export type Command = keyof typeof Commands;

export async function handleDialog(command: Command, db: Database, plugin?: MangaPlugin, query?: string) {
    await Commands[command](db, plugin, query);
}

export async function selectCommand(): Promise<Command> {
    return getUserSelection(Object.keys(Commands) as Array<Command>);
}