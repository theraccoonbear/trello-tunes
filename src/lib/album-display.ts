import { PreparedCard, terminalHyperlink } from '../lib/helpers';

import terminalImage from 'terminal-image';
import chalk from 'chalk';
import emoji from 'node-emoji';
import { format, isFuture, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { loadAlbum } from '../lib/bandcamp';

const termCols = process.stdout.columns;
const horizPad = 10;

export const generateTermialDisplay = async (card: PreparedCard, imageWidth: number = 50): Promise<string> => {
    let coverBuffer = Buffer.from([]);
    if (card.cover.imageBuffer) {
        coverBuffer = card.cover.imageBuffer;
    } else if (card.BCAlbum && card.BCAlbum.coverBuffer) { 
        coverBuffer = card.BCAlbum.coverBuffer;
    }
    const image = await terminalImage.buffer(coverBuffer, { width: imageWidth });
    const maxTrackLen = termCols - imageWidth - horizPad;
    // console.log(`${maxTrackLen} columns for info`);
    
    const artist = chalk.bold(chalk.cyanBright(card.artist));
    const album = chalk.italic(chalk.greenBright(card.album))
    const desc = emoji.emojify(chalk.grey(card.desc));
    const tracks: string[] = [];

    const urlList = [terminalHyperlink(card.urls[0], "BandCamp")];
    if (card.urls.length > 0) {
        card.BCAlbum = await loadAlbum(card.urls[0]);
        card.BCAlbum.tracks.forEach((t, i) => {
            const tn = t.name.length > maxTrackLen ? `${t.name.substr(0, maxTrackLen - 2).trim()}…` : t.name;
            const trackName = t.available ? terminalHyperlink(t.url, chalk.whiteBright(tn)) : tn;
            tracks.push(`  ${chalk.redBright(i + 1)}. ${trackName} ${chalk.italic(chalk.grey(t.lengthDisplay))}`);
        });
    }

    if (card.artist) {
        const url = `https://www.metal-archives.com/search?searchString=${encodeURIComponent(card.artist)}&type=band_name`;
        urlList.push(terminalHyperlink(url, 'Artist at Metallum'));
    }
    if (card.album) {
        const url = `https://www.metal-archives.com/search?searchString=${encodeURIComponent(card.album)}&type=album_title`;
        urlList.push(terminalHyperlink(url, 'Album at Metallum'));
    }

    const urls = `${chalk.whiteBright(urlList.join(` ${chalk.green('//')} `))}\n`;
    
    let release = '';
    if (card.releaseDate) {
        card.releaseDate = new Date(2020, 7, 15);
        const future = isFuture(card.releaseDate);
        const now = new Date();
        const daysAgo = Math.abs(differenceInDays(now, card.releaseDate));
        const weeksAgo = Math.abs(differenceInWeeks(now, card.releaseDate));
        const monthsAgo = Math.abs(differenceInMonths(now, card.releaseDate));

        let time = '';
        const timeRel = future ? 'from now' : 'ago';

        if (daysAgo > 0) {
            time = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ${timeRel}`;
        }
        if (weeksAgo > 0) {
            time = `about ${weeksAgo} week${weeksAgo > 1 ? 's' : ''} ${timeRel}`;
        }
        if (monthsAgo > 0) {
            time = `about ${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ${timeRel}`;
        }

        release = `Releas${future ? 'ing' : 'ed'} ${chalk.blueBright(format(card.releaseDate, 'EEE MMM d'))} (${time})`;
    }

    const runAndSlack: string[] = [];
    if (card.BCAlbum) {
        runAndSlack.push(`${chalk.cyan('Running time')} ${chalk.yellowBright(Math.floor(card.BCAlbum.runningTimeSeconds / 60))} ${chalk.cyan('minutes')}`);
    }
    if (card.slacker) {
        runAndSlack.push(`[${chalk.yellow(card.slacker)}]`);
    }

    const tags = Object
        .keys(card)
        .filter(f => /^has_/.test(f))
        .map(f => chalk.bgBlue(chalk.white(` ${f.replace(/^has_/, '')} `)))
        .join(' : ')

    const details = [
        `${artist} - ${album}`,
        runAndSlack.join(' '),
        '',
        release,
        '', 
        chalk.bold('TRACKS:'),
        tracks.join("\n"),
        '',
        // desc,
        urls,
        tags,
    ].join("\n").split("\n");

    const imageLines = image.split("\n");

    const maxRows = Math.max(imageLines.length, details.length);
    // const minRows = Math.min(imageLines.length, details.length);

    const combined: string[] = [];
    let width = 0;
    for (let i = 0; i < imageLines.length; i++) {
        combined.push(` ${imageLines[i] || ''}  ${details[i] || ''}`);
        width = imageLines[i].length + 3;
    }

    if (imageLines.length > maxRows) {
        for (let i = maxRows; i < imageLines.length; i++) {
            combined.push(` ${imageLines[i] || ''}`);
        }
    } else if (details.length > maxRows) {
        for (let i = maxRows; i < details.length; i++) {
            combined.push(`${' '.repeat(width)}${details[i] || ''}`);
        }
    }

    // console.log("\n\n");
    // console.log(combined.join("\n"));
    return combined.join("\n");

}