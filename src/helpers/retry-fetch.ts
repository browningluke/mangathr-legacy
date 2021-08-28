import { Response } from "node-fetch"
import { delay } from "./async";

import fetch from 'node-fetch';

export const retryFetch = (url: string, fetchOptions = {},
                           retries = 3, retryDelay = 1000,
                           timeout?: number): Promise<Response> => {
    return new Promise((resolve, reject) => {

        // check for timeout
        if(timeout) {
            setTimeout(() => {
                reject('error: timeout') // reject if over time
            }, timeout)
        }

        const wrapper = (n: number) => {
            fetch(url, fetchOptions)
                .then(async (res: Response) => {
                    if (res.status >= 400 && res.status <= 600) {
                        if(n > 0) {
                            process.stdout.clearLine(1);
                            process.stdout.write(`\rRETRYING ${n} MORE TIMES`);
                            await delay(retryDelay)
                            wrapper(--n)
                        } else {
                            console.error(`Error ${res.status} ${res.statusText}`);
                            reject();
                        }
                    } else {
                        resolve(res);
                    }
                })
                .catch(async (err: any) => {
                    if(n > 0) {
                        process.stdout.clearLine(1);
                        process.stdout.write(`\rretrying ${n}`);
                        await delay(retryDelay)
                        wrapper(--n)
                    } else {
                        reject(err)
                    }
                })
        }

        wrapper(retries)
    })
}