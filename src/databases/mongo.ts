import { Collection, Db, MongoClient } from "mongodb";
import { MangaUpdate, Database } from "../types/database";
import { MangaNotRegisteredError, MangaAlreadyRegisteredError } from "../exceptions";
import { delay } from "../helpers/async";

const MC = require('mongodb').MongoClient;

const databaseName = "test";   // This needs to be moved to .env
const collectionName = "test"; // This needs to be hard coded
const dbUrl = 'mongodb://root:example@localhost:10101'; // Debug url

class Mongo implements Database {

	client: MongoClient;
	db: Db | undefined;
	collection: Collection | undefined;

	constructor() {
		this.client = MC(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
	}

	/*
		Setup methods
	 */

	async setup() {
		this.client = await this.client.connect()

		// If db or collection doesn't exist, it will be created when we insert an object.
		this.db = this.client.db(databaseName);
		this.collection = this.db.collection(collectionName);
	}

	async close() {
		await this.client.close();
	}

	/*
    	Helper methods
 	*/

	/**
	 * @throws {DbOrCollectionNotInitializedError}
	 */
	_ensureSetupRan() {
		if (!this.db || !this.collection) {
			throw new DbOrCollectionNotInitializedError();
		}
	}

	/**
	 * @throws {Error}
	 * @param obj
	 */
	async _find(obj: any): Promise<any[] | undefined> {
		this._ensureSetupRan();
		return this.collection!.find(obj).toArray();
	}

	/**
	 * @throws {Error}
	 * @return {any[] | undefined}
	 */
	async findAll(): Promise<any[] | undefined> {
		this._ensureSetupRan();
		return this.collection!.find({}).toArray();
	}

	/**
	 * @throws {Error}
	 * @return {any[]}
	 */
	async _insertOne(obj: any): Promise<any> {
		this._ensureSetupRan();
		return this.collection!.insertOne(obj);
	}

	/**
	 * @throws {Error}
	 * @param searchObj
	 * @param newValues
	 * @return {any}
	 */
	async _update(searchObj: any, newValues: any): Promise<any> {
		this._ensureSetupRan();

		try {
			return this.collection!.updateOne(searchObj, newValues);
		} catch (err) {
			console.error(err);
		}
	}

	/*
		Main functions
	 */

	async registerManga(manga: MangaUpdate) {
		let obj = await this._find({ plugin: manga.plugin, title: manga.title, id: manga.id });

		if (obj && obj.length != 0) {
			throw new MangaAlreadyRegisteredError();
		}
		
		await this._insertOne(manga);
	}

	/**
	 * @throws {Error}
	 * @param func
	 * @param sleep
	 */
	async forEach(func: (manga: MangaUpdate) => Promise<MangaUpdate>, sleep?: number) {
		let allManga: MangaUpdate[] | undefined = await this.findAll();

		if (!allManga) throw new Error("ERROR: failed to load manga from db");

		for (const manga of allManga) {
			let newManga = await func(manga);
			
			await this._updateMangaInDatabase(newManga);

			await delay(sleep ?? 0);
		}
	}

	async _updateMangaInDatabase(manga: MangaUpdate) {
		let searchObj = { plugin: manga.plugin, title: manga.title, id: manga.id };

		let obj = await this._find(searchObj);

		if (!obj || obj.length == 0) {
			throw new MangaNotRegisteredError();
		}

		if (obj != manga.chapters) await this._update(searchObj, { $set: { chapters: manga.chapters } });
	}
}

class DbOrCollectionNotInitializedError extends Error {
	constructor(...params: any[]) {
		// Pass remaining arguments (including vendor specific ones) to parent constructor
		super(...params)

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, DbOrCollectionNotInitializedError)
		}

		this.name = 'DbOrCollectionNotInitializedError';
	}
}

export { Mongo };