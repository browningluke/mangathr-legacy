import { PROJECT_NAME } from "@core/constants";
import isDocker from "@helpers/docker";

import os from 'os';
import path from 'path';

import { config as dotenv } from 'dotenv';

// Load config from dotenv
dotenv();

export default class Config {
    /*
        Singleton Class Definition
     */

    private static instance: Config;
    public static get CONFIG(): Config {
        if (!Config.instance) Config.instance = new Config();
        return Config.instance;
    }

    /*
        Defaults
     */

    private static DEFAULTS = {
        SQLITE_PATH: path.parse(`${os.homedir()}/.${PROJECT_NAME}/database.sqlite`),
        TEST_SQLITE_PATH: path.parse(`${os.homedir()}/.${PROJECT_NAME}/database.test.sqlite`),
        DOWNLOAD_DIR: path.parse(`${process.cwd()}/${PROJECT_NAME}`)
    }

    /*
        env Variables
     */

    private static readonly NODE_ENV = process.env.NODE_ENV;

    /*
        Paths
     */

    private _sqlitePath: path.ParsedPath;
    private _downloadDir: path.ParsedPath;

    /*
        Functions
     */

    private constructor() {
        // Parse path is defined
        const parse = (env?: string) => { return env ? path.parse(env) : undefined };

        // Set defaults
        this._downloadDir = Config.DEFAULTS.DOWNLOAD_DIR;
        this._sqlitePath = Config.DEFAULTS.SQLITE_PATH;

        // Handle existing within a docker container
        if (isDocker()) {
            this._downloadDir = path.parse("/data");
            this._sqlitePath = path.parse("/config/database.sqlite");
        }

        // Prioritize user config options (override defaults)
        if (Config.NODE_ENV == "test") {
            this._sqlitePath = Config.DEFAULTS.TEST_SQLITE_PATH;
            // ...
        } else {
            this._sqlitePath = parse(process.env.SQLITE_PATH) ?? this._sqlitePath;
            // ...
        }
        this._downloadDir = parse(process.env.DOWNLOAD_DIR) ?? this._downloadDir;
    }

    /*
        Getters
     */

    public get SQLITE_STORAGE() {
        return path.format(this._sqlitePath);
    }

    public get DOWNLOAD_DIR() {
        return path.format(this._downloadDir);
    }

    /*
        Setters
     */

    public set SQLITE_STORAGE(val) {
        // Path validation is handled by the sqlite class.
        this._sqlitePath = path.parse(val);
    }

    public set DOWNLOAD_DIR(val) {
        // Path validation is handled by the downloader module.
        this._downloadDir = path.parse(val);
    }
}
