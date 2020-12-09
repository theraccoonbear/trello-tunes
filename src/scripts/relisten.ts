
import { getLabels, getRelistens, loadCache, PreparedCard, terminalHyperlink } from '../lib/helpers';

import terminalImage from 'terminal-image';
import chalk from 'chalk';
import emoji from 'node-emoji';
import { format, isFuture, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { loadAlbum } from '../lib/bandcamp';


async function main() {
    try {
        await loadCache();

        // const nextUp: PreparedCard = await getNextPlay();
        // const labels = await getLabels();
        // console.log(labels);
        const relistens = await getRelistens();
        // console.log(relistens);

        await Promise.all(relistens.map(async (card) => {
            const img = await terminalImage.buffer(card.cover.imageBuffer, { width: 25 });
            console.log(img);
            console.log(card.releaseDate);
            console.log(`${card.artist} - ${card.album}`);
            console.log(card.BCAlbum.url);
        }));

    } catch (err) {
        console.error(`D'oh! ${err.message}`);
        console.error(err);
    }
}

main();