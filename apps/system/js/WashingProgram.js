wm.WashingProgram = (function () {

    'use strict';
    
    let programData = {
        WATER_HARDNESS: 'WATER_HARDNESS',
        WASHING_POWDER: 'WASHING_POWDER',
        FABRIC_CONDITIONER: 'FABRIC_CONDITIONER',
        LOAD_WEIGHT: 'LOAD_WEIGHT',
        WATER_PRESSURE: 'WATER_PRESSURE',
        LOAD_COLOR: 'LOAD_COLOR',
        LOAD_TYPE: 'LOAD_TYPE'
    };

    let loadType = {
        HEAVY: 'HEAVY',
        NORMAL: 'NORMAL',
        DELICATES: 'DELICATES',
        WOOL: 'WOOL'
    };

    let loadColor = {
        WHITE: 'WHITE',
        COLORED: 'COLORED',
        BLACK: 'BLACK'
    };

    let state = {
        IDLE: 'IDLE',
        COLLECTING_DATA: 'COLLECTING_DATA',
        READY: 'READY',
        RUNNING: 'RUNNING',
        FINISHED: 'FINISHED'
    };

    let running = false,
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

    let generateUuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    let fetchWaterHardness = function () {
        let location = wm.Settings.getGeoLocation();

        let url = wm.URI.parse(wm.Config.waterApiUrl);
        let query = {
            latitude: location.latitude,
            longitude: location.longitude
        };
        url.parts.query = wm.URI.serialize(query);

        let request = new XMLHttpRequest();
        request.onload = function () {
            let response = JSON.parse(this.responseText);
            settings.waterHardness = response.water.hardness;
        };
        request.open('get', url.toString(), true);
        request.send();
    };

    let isIdle = function () {
        return settings.programUuid === null &&
            settings.waterHardness === null &&
            settings.washingPowder === null &&
            settings.fabricConditioner === null &&
            settings.loadWeight === null &&
            settings.waterPressure === null &&
            settings.loadColor === null &&
            settings.loadType === null;
    };

    let isReadyToRun = function () {
        return settings.programUuid !== null &&
            settings.waterHardness !== null &&
            settings.washingPowder !== null &&
            settings.fabricConditioner !== null &&
            settings.loadWeight !== null &&
            settings.waterPressure !== null &&
            settings.loadColor !== null &&
            settings.loadType !== null;
    };

    let setLoadType = function (programUuid, loadType) {
        if (programUuid === settings.programUuid) {
            // TODO: validate loadType
            settings.loadType = loadType;
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    let setLoadColor = function (programUuid, loadColor) {
        if (programUuid === settings.programUuid) {
            // TODO: validate loadColor
            settings.loadColor = loadColor;
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    let getState = function () {
        if (running) {
            return state.RUNNING;
        }
        if (finished) {
            return state.FINISHED;
        }
        if (isIdle()) {
            return state.IDLE;
        }
        if (isReadyToRun()) {
            return state.READY;
        }
        return state.COLLECTING_DATA;
    };

    let getMissingData = function () {
        let missingData = [];
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

    let getProgramUuid = function (type) {
        if (type === 'last') {
            let lastProgram = wm.WashingProgramHistory.getProgramByIndex(-1);
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
        loadType: loadType,
        loadColor: loadColor,
        getState: getState,
        state: state,
        getMissingData: getMissingData,
        getProgramUuid: getProgramUuid
    };

})();
