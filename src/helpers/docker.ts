
import fs from 'fs';

let isDockerKnown: boolean;

function isDockerHelper() {
    try {
        fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
    } catch {
        return false;
    }
    try {
		fs.statSync('/.dockerenv');
	} catch {
		return false;
	}

    return true;
}

export default function isDocker() {
    if (isDockerKnown === undefined) {
        isDockerKnown = isDockerHelper();
	}

	return isDockerKnown;
}
