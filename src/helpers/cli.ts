import { Chapter } from "../types/plugin";
import { isDownloaded } from "../downloader";

const readline = require('readline');
const Table = require('cli-table');

const readLineAsync = (): Promise<string> => {
    const rl = readline.createInterface({
        input: process.stdin
    });

    return new Promise((resolve) => {
        rl.prompt();
        rl.on('line', (line: string) => {
            rl.close();
            resolve(line);
        });
    });
};

const getUserConfirmation = async (promptString: string): Promise<String> => {
    let answerString: string;
    while (true) {
        process.stdout.write(promptString);
        answerString = await readLineAsync();

        if (answerString.toLowerCase() != "y" && answerString.toLowerCase() != "n") {
            console.log("Your answer has to be one of: (y, n).")
            continue;
        }

        break
    }

    return answerString;
}

async function getNumber(promptString: string, optChecks?: (num: number) => boolean) {
    let isNumber = (n: string) => {
        return !isNaN(parseInt(n)) && isFinite(parseInt(n));
    }

    while (true) {
        process.stdout.write(promptString);

        let numberString = await readLineAsync();

        if (isNumber(numberString) &&
        optChecks ? optChecks(parseFloat(numberString)) : true) {
            return parseFloat(numberString);
        }

        console.log("This number is not valid.")
    }
}

async function generateTable(chapters: Chapter[], mangaTitle: string) {
    let table = new Table({
        head: ['index', 'num', 'title', 'downloaded'],
        chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''}
    });

    chapters.forEach((item, i) => {
        table.push([chapters.length - i, item.num == null ? "" : item.num, item.title,
            isDownloaded(mangaTitle, item.title, item.num) ? "Y" : "N"])
    })
    table.reverse();

    return table;
}

export { readLineAsync, getUserConfirmation, getNumber, generateTable };