import { Database, MangaUpdate } from "../types/database";

import { Command as Commander } from "commander";

export function initManageCommand(program: Commander, db: Database) {
    const deleteFunction = async (id: string, options: any) => {
        // wip
    }

    const listFunction = async () => {
        await printListFromDatabase(db);
    }

    let manageCommand = program
        .command(`manage`)
        .description("Manage command description");

    manageCommand
        .command(`delete [id]`)
        .description("delete description")
        .option('-y', '')
        .action(deleteFunction);

    manageCommand
        .command('list')
        .description('list description')
        .action(listFunction);
}

export async function handleManageDialog(db: Database) {
    return printListFromDatabase(db);
}

// TODO make this not shit (unbad it)
async function printListFromDatabase(db: Database) {
    try {
        const printAllManga = async (manga: MangaUpdate) => {
            console.log(`Title: ${manga.title}, Chapters: ${manga.chapters}, ID: ${manga.id}`);
            return manga;
        }
        await db.forEach(printAllManga);
    } catch (err) {
        console.error(err);
    }
}