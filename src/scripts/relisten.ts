
import { getRelistens, loadCache, prepareCard } from '../lib/helpers';

import terminalImage from 'terminal-image';
import { generateTermialDisplay } from '../lib/album-display'
import * as bc from '../lib/bandcamp';


async function main() {
    try {
        await loadCache();
        const relistens = await getRelistens(1);
        if (relistens.length > 0) {
            const display = await generateTermialDisplay(relistens[0]);
            console.log(display);
        } else {
            console.log(`Couldn't find any re-listens!`);
        }
    } catch (err) {
        console.error(`D'oh! ${err.message}`);
        console.error(err);
    }
}

main();