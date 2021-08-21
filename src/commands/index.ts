import { handleManageDialog, initManageCommand } from "./manage";
import { handleDownloadDialog, initDownloadCommand } from "./download";
import { handleRegisterDialog, initRegisterCommand } from "./register";
import { handleUpdateDialog } from "./update";
import { Database } from "../types/database";

import { Command as Commander } from 'commander';
import { getUserSelection } from "../helpers/cli";

const initFunctions = [initManageCommand, initDownloadCommand, initRegisterCommand];

const Commands = {
    'download': handleDownloadDialog,
    'register': handleRegisterDialog,
    'manage': handleManageDialog,
    'update': handleUpdateDialog
}
export function initCommands(program: Commander, db: Database) {
    for (const a of initFunctions) {
        a(program, db)
    }
}

export async function handleDialog(db: Database) {
    const command = await selectCommand();
    await Commands[command](db);
}

async function selectCommand(): Promise<keyof typeof Commands> {
    return getUserSelection(Object.keys(Commands) as Array<keyof typeof Commands>);
}