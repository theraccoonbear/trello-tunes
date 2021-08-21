
import { getRelistens, loadCache } from '../lib/helpers';

import terminalImage from 'terminal-image';
import { BandcampAlbum } from '../lib/bandcamp';


async function main() {
    try {
        await loadCache();

        // const nextUp: PreparedCard = await getNextPlay();
        // const labels = await getLabels();
        // console.log(labels);
        const relistens = await getRelistens(1);
        // console.log(relistens);

        await Promise.all(relistens.map(async (card) => {
            const album = card.BCAlbum as BandcampAlbum;
            let coverBuffer;
            if (album.coverUrl) {
                coverBuffer = album.coverBuffer;
            } else if (card.cover.imageBuffer) {
                coverBuffer = album.coverBuffer;
            }
            if (coverBuffer) {
                const albumCover = await terminalImage.buffer(album.coverBuffer, { width: 50 });
                console.log(albumCover);
            }
            console.log(`\n * ${card.artist} - ${card.album} : ${card.releaseDate}\n   ${card.BCAlbum.url}`);
        }));

    } catch (err) {
        console.error(`D'oh! ${err.message}`);
        console.error(err);
    }
}

main();