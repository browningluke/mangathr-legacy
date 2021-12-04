import { PROJECT_NAME } from "@core/constants";

import os from 'os';
import path from 'path';

import fs from "fs";

type ConfigFile = Partial<{
    paths: {
        SQLITE_PATH: string,
        DOWNLOAD_DIR: string,
        UPDATE_DIR: string
    },
    includeComicInfo: boolean
}>;

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
    env Variables
     */

    private static readonly NODE_ENV = process.env.NODE_ENV;

    /*
        Defaults
     */

    public static CONFIG_PATH =
        path.parse(`${os.homedir()}/.${PROJECT_NAME}/config` + (Config.NODE_ENV == "test" ? ".test" : "") + `.json`);

    //public static CONFIG_PATH = path.parse(`../config.json`);
    
    private static DEFAULTS = {
        SQLITE_PATH: path.parse(`${os.homedir()}/.${PROJECT_NAME}/database.sqlite`),
        TEST_SQLITE_PATH: path.parse(`${os.homedir()}/.${PROJECT_NAME}/database.test.sqlite`),
        DOWNLOAD_DIR: path.parse(`${process.cwd()}/${PROJECT_NAME}`)
    }

    /*
        Paths
     */

    private _sqlitePath = Config.DEFAULTS.SQLITE_PATH;

    private _destDir = Config.DEFAULTS.DOWNLOAD_DIR;
    private _destDirOverride: path.ParsedPath | undefined;

    private _downloadDir = Config.DEFAULTS.DOWNLOAD_DIR;
    private _updateDir = Config.DEFAULTS.DOWNLOAD_DIR;

    /*
        Misc.
     */

    private _includeComicInfo = true;

    /*
        Functions
     */

    private constructor() {
        this.loadVarsFromConfigFile();

        if (Config.NODE_ENV == "test") {
            this._sqlitePath = Config.DEFAULTS.TEST_SQLITE_PATH;
            // ...
        }
    }

    private loadVarsFromConfigFile() {
        let configFile: ConfigFile | undefined;
        try {
            const rawData = fs.readFileSync(path.format(Config.CONFIG_PATH));
            configFile = JSON.parse(rawData.toString());

            //configFile = require(path.format(Config.CONFIG_PATH));
        } catch (e) {
            // Ignore MODULE_NOT_FOUND error
            console.log("No file, ignoring");
            //console.log(e);
            return;
        }

        console.log("Loaded config file.");
        console.log(configFile);

        // Parse path is defined
        const parse = (v?: string) => { return v ? path.parse(v) : undefined };

        // Parse paths
        this._downloadDir = parse(configFile?.paths?.DOWNLOAD_DIR) ?? this._downloadDir;
        this._updateDir = parse(configFile?.paths?.UPDATE_DIR) ?? this._updateDir;
        this._sqlitePath = parse(configFile?.paths?.SQLITE_PATH) ?? this._sqlitePath;

        // Parse misc
        this._includeComicInfo = configFile?.includeComicInfo ?? this._includeComicInfo;
    }

    // Should only be called for testing, since it defeats the purpose of a singleton class otherwise.
    public reset() {
        Config.instance = new Config();
        return Config.instance;
    }

    /*
        Getters
     */

    public get SQLITE_STORAGE() {
        return path.format(this._sqlitePath);
    }

    public get DEST_DIR() {
        return this._destDirOverride ? path.format(this._destDirOverride) : path.format(this._destDir);
    }

    public get INCLUDE_COMIC_INFO() {
        return this._includeComicInfo;
    }

    /*
        Setters
     */

    public set SQLITE_STORAGE(val) {
        // Path validation is handled by the sqlite class.
        this._sqlitePath = path.parse(val);
    }

    public set INCLUDE_COMIC_INFO(val) {
        this._includeComicInfo = val;
    }

    public setDestDir(command: "download" | "update" | "override", val?: string) {
        // Path validation is handled by the downloader module.
        switch (command) {
            case "download":
                this._destDir = this._downloadDir;
                break;
            case "update":
                this._destDir = this._updateDir;
                break;
            case "override":
                this._destDirOverride = val ? path.parse(val) : this._destDirOverride;
                break;
        }
    }
}
