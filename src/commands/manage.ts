import { shutdown } from "../main";
import { getUserConfirmation, readLineAsync } from "../helpers/cli";

import { Database, MangaUpdate } from "../types/database";

import { Command as Commander } from "commander";
import Table from "cli-table3";

export function initManageCommand(program: Commander, db: Database) {
    const deleteFunction = async (id: string, options: any) => {
        await deleteFromDatabase(db, id, options.y);
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

async function deleteFromDatabase(db: Database, id?: string, skipConfirmation = false) {
    const getUserResp = async (mangaList: MangaUpdate[]) => {
        const mangaIDs: string[] = mangaList.map((manga) => manga.id);

        const ensureRespIsInList = (resp: string) => {
            return mangaIDs.includes(resp);
        }

        let respString: string;
        while (true) {
            process.stdout.write("Please enter a manga id: ");
            respString = await readLineAsync();

            if (!ensureRespIsInList(respString)) {
                console.log("Please enter an ID of a manga is the list.")
                continue;
            }

            break
        }
        return respString;
    }

    if (!id) {
        const mangaList = await printListFromDatabase(db);

        if (mangaList.length == 0) {
            console.log("Database is empty. Nothing to delete.");
            return;
        }

        id = await getUserResp(mangaList);
    }

    const searchResp = await db.find({
        id: id
    });

    const item = searchResp[0];

    if (!item) {
        console.log("Could not find that manga in the database.");
        return;
    }

    if (!skipConfirmation && await getUserConfirmation(
        `Are you sure you want to delete ${item.title} from the database? (y/n): `) == "n") {
        return;
    }

    try {
        await item.destroy();
    } catch (e) {
        console.log(`An error occurred. Failed to delete item. (${e.message})`);
        await shutdown(true);
    }

    console.log(`Deleted ${item.title}`);
}

async function printListFromDatabase(db: Database): Promise<MangaUpdate[]> {
    let colWidths = [25, 20, 33];

    let table = new Table({
        head: ['title', 'id', 'chapters'],
        chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''},
        colWidths: colWidths, wordWrap: true
    });

    let mangaList: MangaUpdate[] = [];

    try {
        const printAllManga = async (manga: MangaUpdate) => {
            mangaList.push(manga);

            // Character length splitting (until https://github.com/cli-table/cli-table3/pull/217 is merged)
            const addSpacesToStringAtLength = (str: string, length: number) => {
                let usedString = str;
                let stringList = [];

                while (usedString.length > 0) {
                    stringList.push(usedString.slice(0, length));
                    usedString = usedString.slice(length)
                }

                return stringList.join(" ");
            }

            let id = addSpacesToStringAtLength(manga.id, colWidths[1] - 2);
            let chapterString = manga.chapters.sort((a ,b) => { return a-b } ).join(", ");
            chapterString = addSpacesToStringAtLength(chapterString, colWidths[2] - 2);

            table.push([manga.title, id, chapterString]);

            return manga;
        }
        await db.forEach(printAllManga);
    } catch (err) {
        console.error(err);
    }

    console.log(table.toString())
    return mangaList;
}
