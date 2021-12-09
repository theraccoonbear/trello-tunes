import { getNextPlay, loadCache } from '../lib/helpers';
import { generateTermialDisplay } from '../lib/album-display'
import * as bc  from '../lib/bandcamp'
import { NewMultiLogger } from '../lib/logger';


async function main() {
    const logger = NewMultiLogger([
        { file:"logs/nextup.log" }, // file logger
        {}                          // console logger
    ]);

    try {
        logger.log("doing the things!");
        await loadCache();

        const nextUp = await getNextPlay();
        logger.log(nextUp);
        if (nextUp.urls.length > 0) {
            nextUp.BCAlbum = await bc.loadAlbum(nextUp.urls[0])
            const display = await generateTermialDisplay(nextUp);
            console.log(display);
        } else {
            logger.log(`Couldn't find anything to listen to!`)
        }
    } catch (e) {
        const err = e as any
        logger.error(`D'oh! ${err.message}`);
        logger.error({ message: err.message, stack: err.stack });
    }
}

main();