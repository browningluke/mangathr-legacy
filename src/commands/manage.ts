import { shutdown } from "@core/main";
import { getUserConfirmation, getUserSelection, readLineAsync } from "@helpers/cli";
import { getPluginFromMap } from "@core/plugins";

import { Database, MangaUpdate } from "database";
import { MangaPlugin } from "plugin";

import { Command as Commander } from "commander";
import Table from "cli-table3";

export function initManageCommand(program: Commander, db: Database) {
    const deleteFunction = async (plugin: string | undefined, id: string | undefined, options: any) => {
        let target: { plugin: MangaPlugin, id: string } | undefined;

        if (id && plugin) {
            const parsedPlugin = getPluginFromMap(plugin);
            if (!parsedPlugin) {
                console.log("Please enter a valid plugin.");
                await shutdown(true);
            }
            target = { id, plugin: parsedPlugin! };
        }
        await deleteFromDatabase(db, target, options.y);
    }

    const listFunction = async (options: any) => { await printListFromDatabase(db, options.showChapters); }

    let manageCommand = program
        .command(`manage`)
        .alias('m')
        .description("manage the manga currently registered in the database");

    manageCommand
        .command(`delete [plugin] [id]`)
        .description("delete a specified manga from the database")
        .option('-y', 'skip user confirmation')
        .action(deleteFunction);

    manageCommand
        .command('list')
        .description('list all manga registered in the database')
        .option('--show-chapters', "show 'Chapters' column")
        .action(listFunction);
}

export async function handleManageDialog(db: Database) {
    switch (await getUserSelection(["List", "Delete"])) {
        case "List":
            return printListFromDatabase(db);
        case "Delete":
            return deleteFromDatabase(db);
        default:
            throw new Error("Switch case outside available list.");
    }
}

async function deleteFromDatabase(db: Database, target?: { plugin: MangaPlugin, id: string },
    skipConfirmation = false) {
    const getUserResp = async () => {
        // Get plugin from user
        let pluginResp: MangaPlugin;
        while (true) {
            process.stdout.write("Please enter a manga plugin: ");
            const pluginRespString = await readLineAsync();
            const tempPlugin = getPluginFromMap(pluginRespString);

            if (tempPlugin) {
                pluginResp = tempPlugin;
                break;
            }
            console.log("Please enter an valid plugin.");
        }

        const mangaList = await printListFromDatabase(db, false, (mu) => {
            return mu.plugin == pluginResp.NAME;
        })
        const mangaIDs: string[] = mangaList.map((manga) => manga.id);

        const ensureRespIsInList = (resp: string) => {
            return mangaIDs.includes(resp);
        }

        // Get manga id from user
        let respString: string;
        while (true) {
            process.stdout.write("Please enter a manga id: ");
            respString = await readLineAsync();

            if (ensureRespIsInList(respString)) break;
            console.log("Please enter an ID of a manga is the list.");
        }
        return { id: respString, plugin: pluginResp };
    }

    if (!target) {
        const mangaList = await printListFromDatabase(db);

        if (mangaList.length == 0) {
            console.log("Database is empty. Nothing to delete.");
            return;
        }
        target = await getUserResp();
    }

    const searchResp = await db.find({ id: target.id, plugin: target.plugin.NAME });
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
        if (typeof e === "string") {
            console.log(`An error occurred. Failed to delete item. (${e})`);
        } else if (e instanceof Error) {
            console.log(`An error occurred. Failed to delete item. (${e.message})`);
        }
        await shutdown(true);
    }

    console.log(`Deleted ${item.title}`);
}

async function printListFromDatabase(db: Database, showChapters = false,
    filter?: (mu: MangaUpdate) => boolean): Promise<MangaUpdate[]> {
    let colWidths = showChapters ? [25, 20, 15, 33] : [35, 43, 15];

    let table = new Table({
        head: showChapters ? ['title', 'id', 'plugin', 'chapters'] : ['title', 'id', 'plugin'],
        chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        colWidths: colWidths, wordWrap: true
    });

    let mangaList: MangaUpdate[] = [];

    try {
        const printAllManga = async (manga: MangaUpdate) => {
            if (filter && !filter(manga)) return manga; // If filtered out, skip printing

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
            if (showChapters) {
                let chapterString = manga.chapters.sort((a, b) => {
                    return a - b
                }).join(", ");
                chapterString = addSpacesToStringAtLength(chapterString, colWidths[2] - 2);

                table.push([manga.title, id, manga.plugin, chapterString]);
            } else {
                table.push([manga.title, id, manga.plugin]);
            }

            return manga;
        }
        await db.forEach(printAllManga);
    } catch (err) {
        console.error(err);
    }

    console.log(table.toString());
    return mangaList;
}
