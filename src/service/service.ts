const play = require('audio-play');
const load = require('audio-loader');


const main = async () => {
    const buff = await load('./sample.mp3'); //.then(play);
    play(buff);


    const opts = {
        //start/end time, can be negative to measure from the end
        start: 0,
        end: buff.duration,
      
        //repeat playback within start/end
        loop: false,
      
        //playback rate
        rate: 1,
      
        //fine-tune of playback rate, in cents
        detune: 0,
      
        //volume
        volume: 1,
      
        //device (for use with NodeJS, optional)
        device: 'hw:1,0',
      
        //possibly existing audio-context, not necessary
        context: require('audio-context'),
      
        //start playing immediately
        autoplay: true
    };
      
    //   //pause/continue playback
    //   play = pause();
    //   pause = play();
      
      //or usual way
      let playback = play(buff, opts, (x, y, z) => {
        console.log('foo!', x, y, z);
      });
      playback.pause();
      playback.play();
      
      //get played time
      playback.currentTime;

};

main();