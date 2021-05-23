// https://stackoverflow.com/a/10073788
function pad(n: any, width: number, z?: string) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}


export { pad };