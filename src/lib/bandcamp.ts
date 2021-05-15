import fetch from 'node-fetch'
import cheerio from 'cheerio';
import json5 from 'json5';
import path from 'path';
import url from 'url';
import fs from './fs';
import * as dfns from 'date-fns'
import { getCache, setCache, hasCache, PrepareCardOptions } from './helpers';


export type AlbumTrack = {
    name: string,
    lengthSeconds: number,
    lengthDisplay: string,
    lyrics?: string,
    url: string,
    available: boolean,
}

export type BandcampAlbum = {
    url: string,
    artist: string,
    album: string,
    releaseDate?: Date,
    tracks: AlbumTrack[],
    runningTimeSeconds: number,
    runningTimeDisplay: string
}


export async function scrape(BCAlbum, html, options: PrepareCardOptions = {} ) {
    const o: PrepareCardOptions = {...{
        cover: false,
        mp3s: false,
    }, ...options};

    const tralbumData = /var\s+TralbumData\s*=\s*(?<stuff>\{.+?\});/ism;
    if (tralbumData.test(html)) {
        const matches = tralbumData.exec(html);
        if (matches && matches.groups) {
            const stuff = matches?.groups?.stuff
                .replace(/"\s\+\s"/g, '');
            let parsed;
            try {
                parsed = json5.parse(stuff);
            } catch (err) {
                console.error('JSON5 Parse Error:');
                console.error(err);
                process.exit(1);
            }

            try {
                if (o.mp3s && parsed && parsed.trackinfo && Array.isArray(parsed.trackinfo)) {
                    const albumDir = `${BCAlbum.artist}-${BCAlbum.album}`;
                    const albumPath = path.join('mp3', albumDir);
                
                    if (! await fs.exists(albumPath)) {
                        await fs.mkdir(albumPath);
                    }
                

                    await Promise.all(parsed.trackinfo.map(async (track, idx) => {
                        const i = idx +1;
                        const trkNum = i < 9 ? `0${i + 1}` : `${i}`;
                        const fileName = `${trkNum} - ${track.title.replace(/[^ A-Za-z0-9_]+/g, '-')}.mp3`;
                        const filePath = path.join(albumPath, fileName);
                        if (track && track.file && !await fs.exists(filePath)) {
                            const mp3 = await fetch(track.file['mp3-128']);
                            await fs.writeFile(filePath, await mp3.buffer());
                        }
                    }));
                }
            } catch (err) {
                console.log('MP3 Download Eror')
            }

        }
    }
}

const cleanName = (inp: string): string => inp.trim().replace(/[^A-Za-z0-9_.]+/g, '-')

export async function loadAlbum(albumUrl: string, mp3s: boolean = true): Promise<BandcampAlbum> {
    const cacheKey = albumUrl.replace(/[^A-Za-z0-9]+/g, '-');

    let html;
    if (hasCache(cacheKey)) {
        console.log(`cache hit for ${albumUrl}`);
        html = getCache(cacheKey);
    } else {
        console.log(`grabbing ${albumUrl}`);
        const res = await fetch(albumUrl);
        html = await res.text();
        // setCache(cacheKey, html);
    }

    const $ = cheerio.load(html);
    const album = $('#name-section h2.trackTitle')
    // const artist = $('span[itemprop="byArtist"] a');
    const artist = $('#name-section h3 span a');

    const tracks = $('table.track_list tr.track_row_view');

    const myRgx = /^\s*(?<json>.+"sponsor".+?)\s*$/mi;

    const match = myRgx.exec(html)

    const meta = json5.parse(match?.groups?.json || '{}');

    const releaseDateRaw = meta.datePublished.replace(/\s+GMT$/, '')

    const dateFmt = "dd MMM yyyy HH:mm:ss"
    const releaseDate = dfns.parse(releaseDateRaw, dateFmt, new Date());

    const urlObj = url.parse(albumUrl);
    const trackList: AlbumTrack[] = tracks.map((i, e) => {
        var $this = $(e);
        const [min, sec] = $this.find('.time').text().trim().split(/:/, 2);
        const lengthSeconds = (60 * parseInt(min || '0', 10)) + parseInt(sec || '0', 10);
        const lengthDisplay = `${parseInt(min, 10)}:${sec}`;
        const linkedTitle = $this.find('.track-title').text();
        const title = $this.find('.title span').text();

        const path = $this.find('.title a').attr('href') || '';
        const track: AlbumTrack = {
            name: linkedTitle || title,
            lengthSeconds: min && sec ? lengthSeconds : 0,
            lengthDisplay: min && sec ? lengthDisplay : '',
            lyrics: '',
            url: `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? `:${urlObj.port}` : ''}${path}`,
            available: path.length > 0
        };
        return track;
    }).get();

    const runningTimeSeconds = trackList.reduce((p: number, c: AlbumTrack) => p + c.lengthSeconds, 0);
    const runMin = Math.floor(runningTimeSeconds / 60);
    const runSec = runningTimeSeconds - (runMin * 60);

    const BCAlbum: BandcampAlbum = {
        url: albumUrl,
        artist: cleanName(artist.text()),
        album: cleanName(album.text()),
        releaseDate,
        tracks: trackList,
        runningTimeSeconds,
        runningTimeDisplay: `${runMin}:${(runSec < 10 ? '0' : '') + runSec}`
    };

    await scrape(BCAlbum, html, { mp3s });

    return BCAlbum;
}

