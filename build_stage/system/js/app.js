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
        wm.WashingProgram.init();
        wm.WashingApi.init();
        
        let statusText = document.getElementById('status-text'),
            durationCircle = document.getElementById('duration-circle'),
            duration = document.getElementById('duration');
        
        wm.WashingProgram.addEventListener('data-changed', function (e) {
            if (e.requiredData.length !== e.missingData.length) {
                statusText.textContent = 'collecting data';
                durationCircle.style.strokeDashoffset = (440 / e.requiredData.length) * e.missingData.length;
            } else if (e.missingData.length > 0) {
                statusText.textContent = 'idle';
                durationCircle.style.strokeDashoffset = 440;
            } else {
                statusText.hidden = true;
                duration.hidden = false;
            }   
        });
        
        // Ready
        pin2.writeDigital(1);
        setTimeout(() => {
            pin2.writeDigital(1);
        }, 50);

    });
});
