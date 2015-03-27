wm.WashingApi = (function () {

    'use strict';

    let wifiManager = navigator.mozWifiManager,
        lastIp,
        httpServer,
        events = {};

    let lengthInUtf8Bytes = function (str) {
        // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
        let m = encodeURIComponent(str).match(/%[89ABab]/g);
        return str.length + (m ? m.length : 0);
    };

    let init = function () {

        registerEvent('initialized');

        if ('onconnectioninfoupdate' in wifiManager) {
            wifiManager.onconnectioninfoupdate = function (e) {
                if (e.ipAddress && lastIp !== e.ipAddress) {

                    if (httpServer) {
                        console.log('Stopping HTTP Server ...');
                        httpServer.stop();
                    }

                    console.log('Starting HTTP Server ...');

                    httpServer = new HTTPServer(wm.Config.ApiServerPort);

                    httpServer.addEventListener('request', function (evt) {
                        let request = evt.request,
                            response = evt.response,
                            date = new Date().toUTCString(),
                            body = '',
                            type,
                            programUuid;

                        // default to JSON
                        response.headers['Content-Type'] = 'application/json; charset=utf-8';

                        // default to error message
                        // TODO: better handling for invalid requests with more clear exception messages
                        body = '{"message":"invalid request"}';

                        switch (request.path) {
                        case '':
                        case '/':
                            response.headers['Content-Type'] = 'text/html; charset=utf-8';
                            body = 'Welcome to the Washing Machine API';
                            break;

                        case '/start':
                            body = JSON.stringify({
                                success: wm.WashingProgram.start()
                            });
                            break;

                        case '/stop':
                            body = JSON.stringify({
                                success: wm.WashingProgram.stop()
                            });
                            break;

                        case '/data/state':
                            type = 'current'; // type = current, last
                            if ('type' in request.params) {
                                type = request.params.type;
                            }
                            let responseObj = {
                                state: wm.WashingProgram.getState(),
                                programUuid: wm.WashingProgram.getProgramUuid(type)
                            };
                            if (responseObj.state === wm.WashingProgram.state.COLLECTING_DATA) {
                                responseObj.missingData = wm.WashingProgram.getMissingData()
                            }
                            body = JSON.stringify(responseObj);
                            break;

                        case '/data/program-uuid':
                            type = 'current'; // type = current, last
                            if ('type' in request.params) {
                                type = request.params.type;
                            }
                            body = JSON.stringify({
                                programUuid: wm.WashingProgram.getProgramUuid(type)
                            });
                            break;

                        case '/data/cycle-of-program':
                            // programUuid
                            break;

                        case '/data/washing-program':
                            // programUuid
                            break;

                        case '/data/washing-powder-fill-level':
                            body = JSON.stringify({
                                fillLevel: 0
                            });
                            break;

                        case '/data/fabric-conditioner-fill-level':
                            body = JSON.stringify({
                                fillLevel: 0
                            });
                            break;

                        case '/data/water-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/data/electricity-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/data/washing-powder-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/data/fabric-conditioner-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/data/duration':
                            // programUuid
                            break;

                        case '/data/total-operating-hours':
                            body = JSON.stringify({
                                operatingHours: 0
                            });
                            break;

                        case '/data/load-weight':
                            // programUuid
                            break;

                        case '/data/washing-powder':
                            if ('programUuid' in request.params && 'washingPowder[type]' in request.params && 'washingPowder[dosis]' in request.params) {
                                programUuid = request.params.programUuid;
                                let washingPowder = request.params['washingPowder[dosis]'];

                                body = JSON.stringify({
                                    success: wm.WashingProgram.setWashingPowder(programUuid, washingPowder)
                                });
                            } else {
                                body = JSON.stringify({
                                    success: false,
                                    message: 'programUuid or washingPowder missing'
                                });
                            }
                            break;

                        case '/data/fabric-conditioner':
                            if ('programUuid' in request.params && 'fabricConditioner[dosis]' in request.params) {
                                programUuid = request.params.programUuid;
                                let fabricConditioner = request.params['fabricConditioner[dosis]'];

                                body = JSON.stringify({
                                    success: wm.WashingProgram.setFabricConditioner(programUuid, fabricConditioner)
                                });
                            } else {
                                body = JSON.stringify({
                                    success: false,
                                    message: 'programUuid or fabricConditioner missing'
                                });
                            }
                            break;

                        case '/data/water-hardness':
                            if ('programUuid' in request.params && 'waterHardness' in request.params) {
                                programUuid = request.params.programUuid;
                                let waterHardness = request.params.waterHardness;

                                body = JSON.stringify({
                                    success: wm.WashingProgram.setWaterHardness(programUuid, waterHardness)
                                });
                            } else {
                                body = JSON.stringify({
                                    success: false,
                                    message: 'programUuid or waterHardness missing'
                                });
                            }
                            break;

                        case '/data/type-of-load':
                            if ('programUuid' in request.params && 'type' in request.params) {
                                programUuid = request.params.programUuid;
                                type = request.params.type;

                                body = JSON.stringify({
                                    success: wm.WashingProgram.setLoadType(programUuid, type)
                                });
                            } else {
                                body = JSON.stringify({
                                    success: false,
                                    message: 'programUuid or type missing'
                                });
                            }
                            break;

                        case '/data/color-of-load':
                            if ('programUuid' in request.params && 'color' in request.params) {
                                programUuid = request.params.programUuid;
                                let color = request.params.color;

                                body = JSON.stringify({
                                    success: wm.WashingProgram.setLoadColor(programUuid, color)
                                });
                            } else {
                                body = JSON.stringify({
                                    success: false,
                                    message: 'programUuid or color missing'
                                });
                            }
                            break;

                        case '/data/additional-settings':
                            // programUuid
                            break;

                        case '/data/temperature-used':
                            // programUuid
                            break;

                        case '/data/speed-used':
                            // programUuid
                            break;

                        case '/data/ground-water-temperature':
                            // programUuid
                            break;

                        case '/data/type-of-washing-powder':
                            // programUuid
                            break;

                        case '/data/type-of-fabric-conditioner':
                            // get / set
                            break;

                        case '/data/type-of-washing-powder-used':
                            // get / set
                            break;

                        case '/data/type-of-fabric-conditioner-used':
                            // programUuid
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

                    dispatchEvent('initialized', {
                        ipAddress: e.ipAddress
                    });

                    window.addEventListener('beforeunload', function () {
                        httpServer.stop();
                    });
                }
                lastIp = e.ipAddress;
            };
        }
    };

    let registerEvent = function (eventName) {
        events[eventName] = new wm.Event(eventName);
    };

    let dispatchEvent = function (eventName, eventArgs) {
        events[eventName].callbacks.forEach(function (callback) {
            callback(eventArgs);
        });
    };

    let addEventListener = function (eventName, callback) {
        events[eventName].registerCallback(callback);
    };

    return {
        init: init,
        addEventListener: addEventListener
    };

})();
