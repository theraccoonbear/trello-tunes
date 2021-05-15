import * as dfns from 'date-fns'

const releaseDateRaw = "14 Jan 2021 13:42:21";


const dateFmt = "dd MMM yyyy HH:mm:ss";

const releaseDate = dfns.parse(releaseDateRaw, dateFmt, new Date());

console.log(`Release Date: "${releaseDateRaw}" as "${dateFmt}" => ${releaseDate}`)