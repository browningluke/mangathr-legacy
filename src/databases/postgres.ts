import { Database, MangaUpdate } from "database";
import { delay } from "@helpers/async";
import { MangaAlreadyRegisteredError } from "@core/exceptions";
import pg from 'pg';
import Config from "@core/config";

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

export default class Postgres implements Database {

    /*
        Setup methods
    */

    private db: pg.Client | undefined; // undefined, since db is only opened when setup() is called
    private static readonly TABLE_NAME = "manga";
    private static readonly SCHEMA = "(plugin TEXT, title TEXT, id TEXT, chapters TEXT)";

    async setup() {
        if (Config.CONFIG.PSQL_CONNECTION_STRING == null) {
            console.log("\x1b[31mMust specify a connection string when using postgres driver.\x1b[0m");
            process.exit(1);
        }

        this.db = new pg.Client({
            connectionString: Config.CONFIG.PSQL_CONNECTION_STRING
        })

        await this.db.connect();

        // Create table
        let res;
        try {
            res = await this.db
                .query(`CREATE TABLE ${Postgres.TABLE_NAME} ${Postgres.SCHEMA};`);
        } catch (e: any) {
            if ('code' in e && e.code == "42P07") {
                // Ignore, since table already exists
            } else {
                throw e;
            }
        }
    }

    async close() { await this.db!.end(); }

    async reset() {
        if (!this.db) throw new Error("Setup() must be called before db can be used.");

        const res = await this.db.query(`DROP TABLE ${Postgres.TABLE_NAME};`);
        // console.log(`drop table result ${res.rows}`);
        await this.setup();
    }

    /*
        Helper methods
    */

    private async insertOne(obj: MangaUpdate) {
        if (!this.db) throw new Error("Setup() must be called before db can be used.");

        const res = await this.db
            .query(`INSERT INTO ${Postgres.TABLE_NAME} (plugin, title, id, chapters) VALUES ($1, $2, $3, $4) RETURNING *`,
                [
                    obj.plugin,
                    obj.title,
                    obj.id,
                    JSON.stringify(obj.chapters)
                ]);
        // console.log(`Rows added: ${res.rowCount}`);
    }

    private static generateStringFromMangaUpdate(obj: Partial<MangaUpdate>) {
        let queries = [];
        let params = [];
        let counter = 1;

        for (const [value, key] of [[obj.plugin, "plugin"], [obj.title, "title"],
            [obj.id, "id"], [obj.chapters, "chapters"]]) {
            if (value != undefined) {
                queries.push(`${key} = $${counter}`);
                params.push(JSON.stringify(value));
                counter++;
            }
        }

        return [queries.join(" AND "), params] as const;
    }

    private generateSelectStatement(obj?: PartialMUNoChapters): Promise<pg.QueryResult<MUSchema>> {
        if (!this.db) throw new Error("Setup() must be called before db can be used.");

        let [queries, paramList] = (obj ? Postgres.generateStringFromMangaUpdate(obj!) : ["", []])
        let queryString = obj ? " WHERE " + queries : "";

        return this.db.query(
            `SELECT * FROM ${Postgres.TABLE_NAME}` + queryString,
            paramList
        );
    }

    private async deleteItem(obj: { plugin: string, title: string, id: string }) {
        if (!this.db) throw new Error("Setup() must be called before db can be used.");

        const res = await this.db
            .query(`DELETE FROM ${Postgres.TABLE_NAME}` +
                ` WHERE plugin = $1 AND title = $2` +
                ` AND id = $3`,
                [
                    obj.plugin, obj.title, obj.id
                ]);
        // console.log(`Deleted ${obj.id}: ${res.rowCount}`);
    }

    private async updateItem(obj: { plugin: string, title: string, id: string }, newObj: Partial<MangaUpdate>) {
        if (!this.db) throw new Error("Setup() must be called before db can be used.");

        let [andString, paramsList] = Postgres.generateStringFromMangaUpdate(newObj);
        let paramCounter = paramsList.length + 1;

        // If new object is empty, don't update
        if (andString.length == 0) return

        const res = await this.db
            .query(`UPDATE ${Postgres.TABLE_NAME} SET ${andString}` +
                ` WHERE plugin = $${paramCounter} AND title = $${paramCounter + 1} AND id = $${paramCounter + 2}`,
                [
                    ...paramsList,
                    ...[
                    obj.plugin, obj.title, obj.id
                    ]
                ]
            );
        // console.log(`Update: ${res.rowCount}`);
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
                    await this.deleteItem({ plugin: getObj.plugin, title: getObj.title, id: getObj.id });
                },
                update: async (obj) => {
                    await this.updateItem({ plugin: getObj.plugin, title: getObj.title, id: getObj.id }, obj);
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

        let getObj  = await this.generateSelectStatement(newObj);
        if (getObj.rowCount == null || getObj.rowCount == 0) {
            return [];
        }
        if (getObj.rowCount > 1) {
            throw new Error("Found more than 1 row!");
        }

        const returnedObj = Object.assign(newObj, getObj.rows[0])

        return this.generateFoundObjArray([returnedObj]);
    }

    async findAll() {
        let getObjArray: MUSchema[] = (await this.generateSelectStatement()).rows;
        return this.generateFoundObjArray(getObjArray);
    }

    async registerManga(manga: MangaUpdate) {
        let obj = await this.find({ plugin: manga.plugin, id: manga.id });

        if (obj && obj.length != 0) {
            throw new MangaAlreadyRegisteredError();
        }

        await this.insertOne(manga);
    }

    async forEach(func: (manga: MangaUpdate) => Promise<MangaUpdate>,
        sleep?: number, errHandler?: (err: unknown) => void) {
        let allManga = await this.findAll();

        if (!allManga) throw new Error("ERROR: failed to load manga from db");

        for (const manga of allManga) {
            let newManga;
            try {
                newManga = await func(manga as MangaUpdate);
            } catch (err) {
                errHandler?.(err);
                continue;
            }

            if (manga.chapters != newManga.chapters) {
                await manga.update({ chapters: newManga.chapters })
            }

            await delay(sleep ?? 0);
        }
    }
}