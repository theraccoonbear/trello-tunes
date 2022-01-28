import { BandcampAlbum, getCollection, loadAlbum } from "../lib/bandcamp";

const main = async () => {
    const data = await getCollection('theraccoonbear');
    // console.log(JSON.stringify(data, null, 2));
    console.log(Object.keys(data));
    console.log(JSON.stringify(data.items[0], null, 2));
    data.items.forEach(alb => console.log(alb.band_name, alb.album_title, alb.releases))

    const albs: BandcampAlbum[] = [];
    await Promise.all(data.items.map(async alb => {
        const bcAlb = await loadAlbum(alb.item_url, false)
        albs.push(bcAlb);
    }));

    console.log(albs[0]);
  
};

main();