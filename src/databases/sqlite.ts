import { Database, MangaUpdate } from "database";
import { delay } from "@helpers/async";
import { MangaAlreadyRegisteredError } from "@core/exceptions";
import Config from "@core/config";
import SQLite3, { SqliteError } from 'better-sqlite3';
import path from "path";
import fs from "fs";

type MUSchema = {
    plugin: string,
    title: string,
    id: string,
    chapters: string
}

type DBItem = {
    plugin: string,
    title: string,
    id: string,
    chapters: number[],
    destroy: () => void
    update: (obj: Partial<MangaUpdate>) => void
}

type PartialMUNoChapters = {
    plugin?: string,
    title?: string,
    id?: string
}

export default class SQLite implements Database {

    /*
        Setup methods
    */

    private readonly db: SQLite3.Database;
    private static readonly TABLE_NAME = "manga";
    private static readonly SCHEMA = "(plugin TEXT, title TEXT, id TEXT, chapters TEXT)";

    constructor() {
        const filePath = Config.CONFIG.SQLITE_STORAGE;

        // Handle full path not existing
        fs.mkdirSync(path.dirname(filePath), { recursive: true })

        this.db = new SQLite3(filePath); //, { verbose: console.log });
    }

    async setup() {
        // Create table
        let stmt;
        try {
            stmt = this.db
                .prepare(`CREATE TABLE ${SQLite.TABLE_NAME} ${SQLite.SCHEMA};`);
        } catch (e) {
            if (e instanceof SqliteError) {
                // ignore as db already exists.
            } else {
                throw e;
            }
        }

        if (stmt) {
            let info = stmt.run();
            //console.log(`create table result ${info.changes}`);
        }
    }

    async close() { this.db.close(); }

    async reset() {
        const stmt = this.db.prepare(`DROP TABLE ${SQLite.TABLE_NAME};`);
        const info = stmt.run();
        console.log(`drop table result ${info.changes}`);
        await this.setup();
    }

    /*
        Helper methods
    */

    private async insertOne(obj: MangaUpdate) {
        const insert = this.db
            .prepare(`INSERT INTO ${SQLite.TABLE_NAME} (plugin, title, id, chapters)` +
                ` VALUES (@plugin, @title, @id, @chapters)`);

        let cleanedObj = {
            plugin: obj.plugin,
            title: obj.title,
            id: obj.id,
            chapters: JSON.stringify(obj.chapters)
        }

        const info = insert.run(cleanedObj);
        //console.log(`Insert one: ${info.changes}`);
    }

    private static generateStringFromMangaUpdate(obj: Partial<MangaUpdate>) {
        let x = [];

        // god i hate this, but typescript hates what i want to do, so screw it
        if (obj.plugin) x.push(`plugin = @plugin`);
        if (obj.title) x.push(`title = @title`);
        if (obj.id) x.push(`id = @id`);
        if (obj.chapters) x.push(`chapters = @chapters`);

        return x.join(" AND ");
    }

    private generateSelectStatement(obj?: PartialMUNoChapters) {
        let queryString = " WHERE ";

        if (obj) queryString += SQLite.generateStringFromMangaUpdate(obj);

        return this.db
            .prepare(`SELECT * FROM ${SQLite.TABLE_NAME}` + (obj ? `${queryString};` : ';'));
    }

    private deleteItem(obj: { plugin: string, title: string, id: string }) {
        const stmt = this.db
            .prepare(`DELETE FROM ${SQLite.TABLE_NAME}` +
                ` WHERE plugin = @plugin AND title = @title` +
                ` AND id = @id;`);
        const info = stmt.run(obj);
        //console.log(`Deleted ${obj.id}: ${info.changes}`);
    }

    private updateItem(obj: { plugin: string, title: string, id: string }, newObj: Partial<MangaUpdate>) {
        let andString = SQLite.generateStringFromMangaUpdate(newObj);

        // If new object is empty, don't update
        if (andString.length == 0) return

        const stmt = this.db
            .prepare(`UPDATE ${SQLite.TABLE_NAME} SET ${andString}` +
                ` WHERE plugin = @oldPlugin AND title = @oldTitle AND id = @oldId;`);

        const stmtObj = {
            plugin: newObj.plugin,
            title: newObj.title,
            id: newObj.id,
            chapters: JSON.stringify(newObj.chapters),
            oldPlugin: obj.plugin,
            oldTitle: obj.title,
            oldId: obj.id
        }

        const info = stmt.run(stmtObj);
        //console.log(`Update: ${info.changes}`);
    }

    private generateFoundObjArray(getObjArray: MUSchema[]): DBItem[] {
        let foundObjs: DBItem[] = [];

        for (const getObj of getObjArray) {
            foundObjs.push({
                plugin: getObj.plugin,
                title: getObj.title,
                id: getObj.id,
                chapters: JSON.parse(getObj.chapters),
                destroy: async () => {
                    this.deleteItem({ plugin: getObj.plugin, title: getObj.title, id: getObj.id });
                },
                update: async (obj) => {
                    this.updateItem({ plugin: getObj.plugin, title: getObj.title, id: getObj.id}, obj);
                }
            });
        }
        return foundObjs;
    }

    /*
        Main functions
     */

    public async find(obj: Partial<MangaUpdate>) {
        // Disallow searching by chapters
        let newObj: PartialMUNoChapters = {
            plugin: obj.plugin,
            title: obj.title,
            id: obj.id
        };

        let getObj: MUSchema = this.generateSelectStatement(newObj).get(newObj);

        return getObj ? this.generateFoundObjArray([getObj]) : [];
    }

    async findAll() {
        let getObjArray: MUSchema[] = this.generateSelectStatement().all();
        return this.generateFoundObjArray(getObjArray);
    }

    async registerManga(manga: MangaUpdate) {
        let obj = await this.find({ plugin: manga.plugin, id: manga.id });

        if (obj && obj.length != 0) {
            throw new MangaAlreadyRegisteredError();
        }

        await this.insertOne(manga);
    }

    async forEach(func: (manga: MangaUpdate) => Promise<MangaUpdate>, sleep?: number) {
        let allManga = await this.findAll();

        if (!allManga) throw new Error("ERROR: failed to load manga from db");

        for (const manga of allManga) {
            let newManga = await func(manga as MangaUpdate);

            if (manga.chapters != newManga.chapters) {
                await manga.update({chapters: newManga.chapters})
            }

            await delay(sleep ?? 0);
        }
    }
}