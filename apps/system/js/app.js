console.log('app');

//screen.mozLockOrientation(['landscape']);

window.addEventListener('ready', () => {

    'use strict';

    Promise.all([
        navigator.gpio.setPinMode(2, 'output'),
        navigator.gpio.setPinMode(3, 'output')
    ]).then(pins => {

        let [pin2, pin3] = pins;
        
        pin2.writeDigital(0);
        pin3.writeDigital(0);

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
        
        durationCircle.style.strokeDasharray = Math.PI * parseInt(durationCircle.getAttribute('r'), 10) * 2;
        durationCircle.style.strokeDashoffset = durationCircle.style.strokeDasharray;
        
        wm.WashingProgram.addEventListener('data-changed', function (e) {
            if (e.missingData.length > 0) {
                if (e.requiredData.length !== e.missingData.length) {
                    statusText.textContent = 'collecting data';
                    durationCircle.style.strokeDasharray = Math.PI * parseInt(durationCircle.getAttribute('r'), 10) * 2;
                    durationCircle.style.strokeDashoffset = (durationCircle.style.strokeDasharray / e.requiredData.length) * e.missingData.length;
                } else {
                    statusText.textContent = 'idle';
                    durationCircle.style.strokeDashoffset = durationCircle.style.strokeDasharray;
                } 
            } else {
                statusText.textContent = 'ready';
                durationCircle.style.strokeDashoffset = 0;
                //duration.hidden = false;
            }
        });
        
        wm.WashingApi.addEventListener('initialized', function (e) {

            // TODO: for debugging only
            document.getElementById('ip').textContent = e.ipAddress;

            // Ready
            pin2.writeDigital(1);
            setTimeout(() => {
                pin2.writeDigital(1);
            }, 50);
        });
        
        wm.WashingProgram.addEventListener('timer-tick', function (e) {
            durationCircle.style.strokeDashoffset = (durationCircle.style.strokeDasharray / 120) * e.minutesLeft;
            statusText.textContent = '';
            /*
            durationHoursLeft.textContent = Math.floor(minutesLeft / 60);
            let minutes = minutesLeft - Math.floor(minutesLeft / 60) * 60;
            durationMinutesLeft.textContent = minutes < 10 ? '0' + minutes : minutes;
            */
        });
        
    });
});
