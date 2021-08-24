import { getNextPlay, loadCache } from '../lib/helpers';
import { generateTermialDisplay } from '../lib/album-display'
import * as bc  from '../lib/bandcamp'


async function main() {
    try {
        await loadCache();

        const nextUp = await getNextPlay();
        if (nextUp.urls.length > 0) {
            nextUp.BCAlbum = await bc.loadAlbum(nextUp.urls[0])
            const display = await generateTermialDisplay(nextUp);
            console.log(display);
        } else {
            console.log(`Couldn't find anything to listen to!`)
        }
    } catch (err) {
        console.error(`D'oh! ${err.message}`);
        console.error(err);
    }
}

main();