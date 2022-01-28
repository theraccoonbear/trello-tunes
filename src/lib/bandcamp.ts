import fetch from 'node-fetch'
import cheerio from 'cheerio';
import json5 from 'json5';
import path from 'path';
import url from 'url';
import fs from './fs';
import * as dfns from 'date-fns'
import { getCache, setCache, hasCache, PrepareCardOptions } from './helpers';
import { start } from 'repl';


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
    coverUrl: string,
    coverBuffer: Buffer,
}

export type BandcampUser = {
    url: string,
    name: string,
    collection: BandcampAlbum[],
    wishlist: BandcampAlbum[],
}

// Start of Collection Stuff
export interface UrlHints {
    custom_domain_verified?: any;
    slug: string;
    item_type: string;
    custom_domain?: any;
    subdomain: string;
}

export interface ItemArt {
    art_id: number;
    url: string;
    thumb_url: string;
}

export interface CollectionObject {
    message_count?: any;
    label_id?: any;
    item_id: number;
    is_giftable: boolean;
    band_url: string;
    tralbum_id: number;
    gift_sender_name?: any;
    featured_track_duration: number;
    service_name?: any;
    label?: any;
    variant_id?: any;
    item_art_id: number;
    fan_id: number;
    sale_item_id: number;
    item_art_ids?: any;
    band_name: string;
    why?: any;
    album_id: number;
    release_count?: any;
    sale_item_type: string;
    is_purchasable: boolean;
    tralbum_type: string;
    releases?: any;
    band_id: number;
    featured_track_is_custom: boolean;
    also_collected_count: number;
    merch_sold_out: boolean;
    band_location?: any;
    num_streamable_tracks: number;
    download_available: boolean;
    is_preorder: boolean;
    featured_track_title: string;
    item_url: string;
    token: string;
    require_email?: any;
    merch_ids: number[];
    price: number;
    featured_track: number;
    listen_in_app_url: string;
    index?: any;
    service_url_fragment?: any;
    genre_id: number;
    band_image_id?: any;
    item_title: string;
    url_hints: UrlHints;
    item_type: string;
    hidden?: any;
    gift_id?: any;
    package_details?: any;
    licensed_item?: any;
    featured_track_license_id?: any;
    currency: string;
    item_art: ItemArt;
    featured_track_number: number;
    is_subscriber_only: boolean;
    has_digital_download?: any;
    discount?: any;
    purchased: string;
    gift_recipient_name?: any;
    is_subscription_item: boolean;
    is_private: boolean;
    gift_sender_note?: any;
    featured_track_encodings_id: number;
    album_title: string;
    added: string;
    updated: string;
    merch_snapshot?: any;
    item_art_url: string;
    featured_track_url?: any;
    is_set_price: boolean;
}


export interface BandcampCollectionResponse {
    redownload_urls: any,
    item_lookup: any,
    collectors: any,
    last_token: any,
    items: CollectionObject[],
    purchase_infos: any,
    tracklists: any,
    more_available: any,
}

// End of Collection Stuff

export async function scrape(BCAlbum: BandcampAlbum, html, options: PrepareCardOptions = {} ) {
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
        // console.log(`cache hit for ${albumUrl}`);
        html = await getCache(cacheKey);
    } else {
        // console.log(`grabbing ${albumUrl}`);
        const res = await fetch(albumUrl);
        html = await res.text();
        setCache(cacheKey, html);
    }

    const $ = cheerio.load(html);
    const album = $('#name-section h2.trackTitle')
    // const artist = $('span[itemprop="byArtist"] a');
    const artist = $('#name-section h3 span a');

    const tracks = $('table.track_list tr.track_row_view');

    const coverUrl = $('#tralbumArt a.popupImage').attr('href') || '';
    let coverBuffer = Buffer.from([]);
    if (coverUrl) {
        const cover = await fetch(coverUrl);
        coverBuffer = await cover.buffer();
    }

    const myRgx = /^\s*(?<json>.+"sponsor".+?)\s*$/mi;

    const match = myRgx.exec(html)

    const meta = json5.parse(match?.groups?.json || '{}');

    // console.log(meta);

    let releaseDate = new Date();

    if (meta.datePublished) {
        const releaseDateRaw = meta.datePublished.replace(/\s+GMT$/, '')
        const dateFmt = "dd MMM yyyy HH:mm:ss"
        releaseDate = dfns.parse(releaseDateRaw, dateFmt, new Date());
    } else {
        console.error(`No meta for ${albumUrl}`);
    }

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
        coverUrl,
        coverBuffer,
        runningTimeDisplay: `${runMin}:${(runSec < 10 ? '0' : '') + runSec}`
    };

    await scrape(BCAlbum, html, { mp3s });

    return BCAlbum;
}

export async function getUserId(username: string): Promise<string> {
    const startUrl = `https://bandcamp.com/${username}`;

    const cacheKey = startUrl.replace(/[^A-Za-z0-9]+/g, '-');

    let html;
    if (hasCache(cacheKey)) {
        console.log(`cache hit for ${startUrl}`);
        html = await getCache(cacheKey);
    } else {
        console.log(`grabbing ${startUrl}`);
        const res = await fetch(startUrl);
        if (res.status != 200) {
            throw new Error(`Bad getUserId(${startUrl}) response: ${res.status}`);
        }
        html = await res.text();
        setCache(cacheKey, html);
    }
    const $ = cheerio.load(html);
    const attr = $('.follow-unfollow').attr('id');
    if (typeof attr == 'undefined') {
        throw new Error(`Couldn't find user ID for ${username}`);
    }
    return attr.replace(/[^0-9]+/g, '');
}

export async function getCollection(username: string): Promise<BandcampCollectionResponse> {
    const userId = await getUserId(username);
    console.log('User ID:', userId);
    const collectionUrl = 'https://bandcamp.com/api/fancollection/1/collection_items';
    const now = Math.round(new Date().getTime());
    const payload = {
        fan_id: userId,
        older_than_token: `1622118182:${now}:a::`,
        count: 20000
    }
    const resp = await fetch(collectionUrl, { method: 'POST', body: JSON.stringify(payload) });
    const rawData = await resp.text();
    const data = JSON.parse(rawData) as BandcampCollectionResponse;
    return data;
}
