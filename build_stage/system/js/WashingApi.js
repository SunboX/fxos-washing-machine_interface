wm.WashingApi = (function () {

    'use strict';

    let wifiManager = navigator.mozWifiManager,
        lastIp,
        httpServer;

    let lengthInUtf8Bytes = function (str) {
        // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
        let m = encodeURIComponent(str).match(/%[89ABab]/g);
        return str.length + (m ? m.length : 0);
    };

    let init = function () {
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
                        
                        console.log(request.path);
                        console.log(request.params);

                        switch (request.path) {
                        case '':
                        case '/':
                            response.headers['Content-Type'] = 'text/html; charset=utf-8';
                            body = 'Welcome to the Washing Machine API';
                            break;

                        case '/info/state':
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

                        case '/info/program-uuid':
                            ltype = 'current'; // type = current, last
                            if ('type' in request.params) {
                                type = request.params.type;
                            }
                            body = JSON.stringify({
                                programUuid: wm.WashingProgram.getProgramUuid(type)
                            });
                            break;

                        case '/info/cycle-of-program':
                            // programUuid
                            break;

                        case '/info/washing-program':
                            // programUuid
                            break;

                        case '/info/washing-powder-fill-level':
                            body = JSON.stringify({
                                fillLevel: 0
                            });
                            break;

                        case '/info/fabric-conditioner-fill-level':
                            body = JSON.stringify({
                                fillLevel: 0
                            });
                            break;

                        case '/info/water-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/info/electricity-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/info/washing-powder-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/info/fabric-conditioner-used':
                            // programUuid
                            // overAll = true
                            break;

                        case '/info/duration':
                            // programUuid
                            break;

                        case '/info/total-operating-hours':
                            body = JSON.stringify({
                                operatingHours: 0
                            });
                            break;

                        case '/info/load-weight':
                            // programUuid
                            break;

                        case '/info/water-hardness':
                            // programUuid
                            break;

                        case '/info/type-of-load':
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

                        case '/info/color-of-load':
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

                        case '/info/additional-settings':
                            // programUuid
                            break;

                        case '/info/temperature-used':
                            // programUuid
                            break;

                        case '/info/speed-used':
                            // programUuid
                            break;

                        case '/info/ground-water-temperature':
                            // programUuid
                            break;

                        case '/info/type-of-washing-powder':
                            // programUuid
                            break;

                        case '/info/type-of-fabric-conditioner':
                            // get / set
                            break;

                        case '/info/type-of-washing-powder-used':
                            // get / set
                            break;

                        case '/info/type-of-fabric-conditioner-used':
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

                    window.addEventListener('beforeunload', function () {
                        httpServer.stop();
                    });
                }
                lastIp = e.ipAddress;
            };
        }
    };

    return {
        init: init
    };

})();
