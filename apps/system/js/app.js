console.log('app');

//screen.mozLockOrientation(['landscape']);

window.addEventListener('ready', () => {

    'use strict';

    Promise.all([
        navigator.gpio.setPinMode(2, 'output'),
        navigator.gpio.setPinMode(3, 'output')
    ]).then(pins => {

        let [pin2, pin3] = pins;

        // Example: Blink two LED's every 500 ms
        /*
        let blinkTimeout;
        let blinkValue = 0;

        let blink = function () {
            blinkValue ^= 1;
            pin2.writeDigital(blinkValue);
            blinkValue ^= 1;
            pin3.writeDigital(blinkValue);
            blinkValue ^= 1;
            blinkTimeout = setTimeout(blink, 500);
        }
        blink();
        */

        wm.WashingProgramHistory.init();
        wm.WashingApi.init();

        // Ready
        pin2.writeDigital(1);
        setTimeout(() => {
            pin2.writeDigital(1);
        }, 50);

    });
});
