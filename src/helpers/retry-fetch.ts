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
                .then((res: Response) => { resolve(res) })
                .catch(async (err: any) => {
                    if(n > 0) {
                        console.log(`retrying ${n}`)
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