function lengthInUtf8Bytes(str) {
    // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
    var m = encodeURIComponent(str).match(/%[89ABab]/g);
    return str.length + (m ? m.length : 0);
}

window.addEventListener('ready', () => {

    // First we map our pins to be input / output pins
    // We don't support pullup/pulldown, you need to do that with hardware
    Promise.all([
        navigator.gpio.setPinMode(2, 'output'),
        navigator.gpio.setPinMode(3, 'output')
    ]).then(pins => {

        // Here you have a reference to your pins again
        // You can also use navigator.gpio.getPin(ID)
        let [pin2, pin3] = pins;

        var pin2value = 0,
            pin3value = 0;

        //pin2.writeDigital(1);

        let wifiManager = navigator.mozWifiManager,
            lastIp, httpServer;

        if ('onconnectioninfoupdate' in wifiManager) {
            wifiManager.onconnectioninfoupdate = function (e) {
                if (e.ipAddress && lastIp !== e.ipAddress) {

                    if (httpServer) {
                        console.log('Stopping HTTP Server ...');
                        httpServer.stop();
                    }

                    console.log('Starting HTTP Server ...');

                    httpServer = new HTTPServer(8080);

                    httpServer.addEventListener('request', function (evt) {
                        let request = evt.request,
                            response = evt.response,
                            date = new Date().toUTCString(),
                            body = '';

                        switch (request.path) {
                        case '':
                        case '/':
                            response.headers['Content-Type'] = 'text/html; charset=utf-8';
                            body = 'Welcome to the Washing Machine API';
                            break;

                        case '/gpio_set_pin_mode':
                            response.headers['Content-Type'] = 'application/json; charset=utf-8';

                            for (var key in request.params) {
                                switch (key) {
                                case 'pin2':
                                    switch (request.params.pin2) {
                                    case 'on':
                                        pin2value = 1;
                                        break;

                                    case 'off':
                                        pin2value = 0;
                                        break;

                                    case 'toggle':
                                        pin2value ^= 1;
                                        break;
                                    }
                                    body = 'done: pin 2 - ' + pin2value;
                                    pin2.writeDigital(pin2value);
                                    break;

                                case 'pin3':
                                    switch (request.params.pin3) {
                                    case 'on':
                                        pin3value = 1;
                                        break;

                                    case 'off':
                                        pin3value = 0;
                                        break;

                                    case 'toggle':
                                        pin3value ^= 1;
                                        break;
                                    }
                                    body = 'done: pin 3 - ' + pin3value;
                                    pin3.writeDigital(pin3value);
                                    break;
                                }
                            }
                            break;
                        }

                        response.headers['Access-Control-Allow-Origin'] = '*';
                        response.headers['Last-Modified'] = date;
                        response.headers['Pragma'] = 'public';
                        response.headers['Cache-Control'] = 'public, max-age=0';
                        response.headers['Expires'] = date;
                        response.headers['Content-Length'] = lengthInUtf8Bytes(body);

                        response.send(body);
                    });

                    httpServer.start();

                    console.log('HTTP Server running at: http://' + e.ipAddress + ':' + httpServer.port + '/');

                    window.addEventListener('beforeunload', function () {
                        httpServer.stop();
                    });
                }
                lastIp = e.ipAddress;
            };
        }

    });
});
