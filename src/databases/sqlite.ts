import { sequelize } from "./sequelize/sequelize";
import { MangaSchema } from "./sequelize/manga.model";
import { Database, MangaUpdate } from "database";
import { delay } from "@helpers/async";
import { MangaAlreadyRegisteredError } from "@core/exceptions";

export class SQLite implements Database {

    /*
        Setup methods
    */

    async setup() {
        await sequelize.sync();
    }

    async close() {
        await sequelize.close();
    }

    async reset() {
        await sequelize.sync({ force: true });
    }

    /*
        Helper methods
    */

    private static async insertOne(obj: MangaUpdate) {
        return await MangaSchema.create(obj);
    }

    public async find(obj: Partial<MangaUpdate>) {
        return await MangaSchema.findAll({
            where: obj
        })
    }

    /*
		Main functions
	*/

    async findAll() {
        return await MangaSchema.findAll();
    }

    async registerManga(manga: MangaUpdate) {
        let obj = await this.find({ plugin: manga.plugin, id: manga.id });

        if (obj && obj.length != 0) {
            throw new MangaAlreadyRegisteredError();
        }

        await SQLite.insertOne(manga);
    }

    async forEach(func: (manga: MangaUpdate) => Promise<MangaUpdate>, sleep?: number) {
        let allManga = await this.findAll();

        if (!allManga) throw new Error("ERROR: failed to load manga from db");

        for (const manga of allManga) {
            let newManga = await func(manga);

            await manga.update({chapters: newManga.chapters})

            await delay(sleep ?? 0);
        }
    }
}