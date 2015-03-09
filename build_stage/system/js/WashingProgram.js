wm.WashingProgram = (function () {
    
    var programData = {
        WATER_HARDNESS: '',
        WASHING_POWDER: '',
        FABRIC_CONDITIONER: '',
        LOAD_WEIGHT: '',
        WATER_PRESSURE: '',
        LOAD_COLOR: '',
        LOAD_TYPE: ''
    };

    var loadTypes = {
        HEAVY: 'HEAVY',
        NORMAL: 'NORMAL',
        DELICATES: 'DELICATES',
        WOOL: 'WOOL'
    };

    var loadColor = {
        WHITE: 'WHITE',
        COLORED: 'COLORED',
        BLACK: 'BLACK'
    };

    var states = {
        IDLE: 'IDLE',
        COLLECTING_DATA: 'COLLECTING_DATA',
        READY: 'READY',
        RUNNING: 'RUNNING',
        FINISHED: 'FINISHED'
    };

    var running = false,
        finished = false,
        settings = {
            programUuid: null,
            waterHardness: null,
            washingPowder: null,
            fabricConditioner: null,
            loadWeight: null,
            waterPressure: null,
            loadColor: null,
            loadType: null
        },
        currentProgram = [];

    var generateUuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    var fetchWaterHardness = function () {
        var location = wm.Settings.getGeoLocation();

        var url = wm.URI.parse(wm.Config.waterApiUrl);
        var query = {
            latitude: location.latitude,
            longitude: location.longitude
        };
        url.parts.query = wm.URI.serialize(query);

        var request = new XMLHttpRequest();
        request.onload = function () {
            var response = JSON.parse(this.responseText);
            settings.waterHardness = response.water.hardness;
        };
        request.open('get', url.toString(), true);
        request.send();
    };

    var isIdle = function () {
        return settings.programUuid === null &&
            settings.waterHardness === null &&
            settings.washingPowder === null &&
            settings.fabricConditioner === null &&
            settings.loadWeight === null &&
            settings.waterPressure === null &&
            settings.loadColor === null &&
            settings.loadType === null;
    };

    var isReadyToRun = function () {
        return settings.programUuid !== null &&
            settings.waterHardness !== null &&
            settings.washingPowder !== null &&
            settings.fabricConditioner !== null &&
            settings.loadWeight !== null &&
            settings.waterPressure !== null &&
            settings.loadColor !== null &&
            settings.loadType !== null;
    };

    var setLoadType = function (programUuid, loadType) {
        if (programUuid === settings.programUuid) {
            // TODO: validate loadType
            settings.loadType = loadType;
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    var setLoadColor = function (programUuid, loadColor) {
        if (programUuid === settings.programUuid) {
            // TODO: validate loadColor
            settings.loadColor = loadColor;
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    var getState = function () {
        if (running) {
            return states.RUNNING;
        }
        if (finished) {
            return states.FINISHED;
        }
        if (isIdle()) {
            return states.IDLE;
        }
        if (isReadyToRun()) {
            return states.READY;
        }
        return states.COLLECTING_DATA;
    };

    var getMissingData = function () {
        var missingData = [];
        if (settings.waterHardness === null) {
            missingData.push(programData.WATER_HARDNESS);
        }
        if (settings.washingPowder === null) {
            missingData.push(programData.WASHING_POWDER);
        }
        if (settings.fabricConditioner === null) {
            missingData.push(programData.FABRIC_CONDITIONER);
        }
        if (settings.loadWeight === null) {
            missingData.push(programData.LOAD_WEIGHT);
        }
        if (settings.waterPressure === null) {
            missingData.push(programData.WATER_PRESSURE);
        }
        if (settings.loadColor === null) {
            missingData.push(programData.LOAD_COLOR);
        }
        if (settings.loadType === null) {
            missingData.push(programData.LOAD_TYPE);
        }
        return missingData;
    };

    var getProgramUuid = function (type) {
        if (type === 'last') {
            var lastProgram = wm.WashingProgramHistory.getProgramByIndex(-1);
            if (lastProgram) {
                return lastProgram.programUuid;
            }
        }
        if (settings.programUuid === null) {
            settings.programUuid = generateUuid();
        }
        return settings.programUuid;
    };

    // public
    return {
        setLoadType: setLoadType,
        setLoadColor: setLoadColor,
        loadTypes: loadTypes,
        loadColor: loadColor,
        getState: getState,
        states: states,
        getMissingData: getMissingData,
        getProgramUuid: getProgramUuid
    };

})();
