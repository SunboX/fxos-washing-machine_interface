console.log('app');

window.addEventListener('ready', () => {

    'use strict';

    Promise.all([
        navigator.gpio.setPinMode(2, 'output'),
        navigator.gpio.setPinMode(3, 'output')
    ]).then(pins => {

        let [pin2, pin3] = pins;

        wm.WashingProgramHistory.init();
        wm.WashingApi.init();

    });
});
