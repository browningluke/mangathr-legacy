import os from 'os';

export const PROJECT_NAME = "mangathr"

export const DOWNLOAD_DIR = `${process.cwd()}/mangathr`//
export const SQLITE_STORAGE = `${os.homedir()}/.${PROJECT_NAME}/database.sqlite`;

export const TABLE_COL_WIDTHS = [9, 9, 50, 13];

// Downloader
export const SIMULTANEOUS_IMAGES = 3;
export const IMAGE_DELAY_TIME = 100;
export const CHAPTER_DELAY_TIME = 200;
export const UPDATE_CHAPTER_DELAY_TIME = 2000;

// Mongodb WIP
export const MONGO_DBNAME = "test";  // This needs to be moved to .env
export const MONGO_COLLNAME = "test"; // This can be hard-coded
export const MONGO_URL = "mongodb://root:example@localhost:10101" // Dev url