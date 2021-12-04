import fs from 'fs';
import Config from "@core/config";
import path from "path";
import os from "os";
import {PROJECT_NAME} from "@core/constants";

const CONFIG_PATH = path.format(Config.CONFIG_PATH);
const getPathStringFromString = (s: string) => { return path.format(path.parse(s)); }


// Defaults
const SQLITE_PATH = getPathStringFromString(`${os.homedir()}/.${PROJECT_NAME}/database.sqlite`);
const TEST_SQLITE_PATH = getPathStringFromString(`${os.homedir()}/.${PROJECT_NAME}/database.test.sqlite`);
const DOWNLOAD_DIR = getPathStringFromString(`${process.cwd()}/${PROJECT_NAME}`);


const NULL_CONTENT = {
    paths: {
        SQLITE_PATH: "",
        DOWNLOAD_DIR: "",
        UPDATE_DIR: ""
    }
}

const VALID_CONTENT = {
    paths: {
        SQLITE_PATH: `${os.homedir()}/.${PROJECT_NAME}/new/database.sqlite`,
        DOWNLOAD_DIR: `${os.homedir()}/.${PROJECT_NAME}/download`,
        UPDATE_DIR: `${os.homedir()}/.${PROJECT_NAME}/update`
    }
}

describe('Test', function () {

    let config: Config;

    const testDefaults = () => {
        it('should contain default paths.', function () {
            expect(config.DEST_DIR).toBe(DOWNLOAD_DIR);
            expect(config.SQLITE_STORAGE).toBe(TEST_SQLITE_PATH);
        });

        it('should handle updating destination dir correctly.', function () {
            expect(config.DEST_DIR).toBe(DOWNLOAD_DIR);

            // Change to download dir
            config.setDestDir("download");
            expect(config.DEST_DIR).toBe(DOWNLOAD_DIR);

            // Change to update dir
            config.setDestDir("update");
            expect(config.DEST_DIR).toBe(DOWNLOAD_DIR);

            // Change to custom dir
            config.setDestDir("override", "./test");
            expect(config.DEST_DIR).toBe(getPathStringFromString("./test"));
        });
    }

    describe('No config file', function () {

        beforeAll(() => {
            console.log("Setting up no config");
            // Setup
            fs.rmSync(CONFIG_PATH, { force: true });
            config = Config.CONFIG.reset();
        });

        testDefaults();

    });

    describe('Empty config file', function () {

        beforeAll(() => {
            console.log("Setting up empty");
            // Setup
            fs.rmSync(CONFIG_PATH, { force: true });
            let data = JSON.stringify({});

            // Create parent dir, if not exist
            fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
            fs.writeFileSync(CONFIG_PATH, data);

            config = Config.CONFIG.reset();
        });

        testDefaults();
    });

    describe("Null Content config file", () => {

        beforeAll(() => {
            console.log("Setting up content");
            // Setup
            fs.rmSync(CONFIG_PATH, { force: true });
            let data = JSON.stringify(NULL_CONTENT);

            // Create parent dir, if not exist
            fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
            fs.writeFileSync(CONFIG_PATH, data);

            config = Config.CONFIG.reset();
        });

        testDefaults();
    });

    describe("Valid Content config file", () => {

        beforeAll(() => {
            console.log("Setting up content");
            // Setup
            fs.rmSync(CONFIG_PATH, { force: true });
            let data = JSON.stringify(VALID_CONTENT);

            // Create parent dir, if not exist
            fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
            fs.writeFileSync(CONFIG_PATH, data);

            config = Config.CONFIG.reset();
        });

        it('should contain loaded paths.', function () {
            expect(config.DEST_DIR).toBe(DOWNLOAD_DIR); // Should contain default until set by download/update/custom.
            expect(config.SQLITE_STORAGE).toBe(TEST_SQLITE_PATH); // When testing, is always TEST_SQLITE_STORAGE.
        });

        it('should handle updating destination dir correctly.', function () {
            expect(config.DEST_DIR).toBe(DOWNLOAD_DIR);

            // Change to download dir
            config.setDestDir("download");
            expect(config.DEST_DIR).toBe(getPathStringFromString(VALID_CONTENT.paths.DOWNLOAD_DIR));

            // Change to update dir
            config.setDestDir("update");
            expect(config.DEST_DIR).toBe(getPathStringFromString(VALID_CONTENT.paths.UPDATE_DIR));

            // Change to custom dir
            config.setDestDir("override", "./test");
            expect(config.DEST_DIR).toBe(getPathStringFromString("./test"));
        });
    });
});