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

    let requiredData = [
        programData.WATER_HARDNESS,
        programData.WASHING_POWDER,
        programData.FABRIC_CONDITIONER,
        programData.LOAD_WEIGHT,
        programData.WATER_PRESSURE,
        programData.LOAD_COLOR,
        programData.LOAD_TYPE
    ];

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
        currentProgram = [],
        events = {};

    let generateUuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
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

    let setWaterHardness = function (programUuid, waterHardness) {
        if (programUuid === settings.programUuid) {
            // TODO: validate waterHardness
            settings.waterHardness = waterHardness;
            dispatchEvent('data-changed', {
                requiredData: requiredData,
                missingData: getMissingData()
            });
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    let setWashingPowder = function (programUuid, washingPowder) {
        if (programUuid === settings.programUuid) {
            // TODO: validate waterHardness
            settings.washingPowder = washingPowder;
            dispatchEvent('data-changed', {
                requiredData: requiredData,
                missingData: getMissingData()
            });
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    let setFabricConditioner = function (programUuid, fabricConditioner) {
        if (programUuid === settings.programUuid) {
            // TODO: validate waterHardness
            settings.fabricConditioner = fabricConditioner;
            dispatchEvent('data-changed', {
                requiredData: requiredData,
                missingData: getMissingData()
            });
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    let setLoadType = function (programUuid, loadType) {
        if (programUuid === settings.programUuid) {
            // TODO: validate loadType
            settings.loadType = loadType;
            dispatchEvent('data-changed', {
                requiredData: requiredData,
                missingData: getMissingData()
            });
            return true;
        }
        // TODO: throw more clear exception if programUuid is wrong
        return false;
    };

    let setLoadColor = function (programUuid, loadColor) {
        if (programUuid === settings.programUuid) {
            // TODO: validate loadColor
            settings.loadColor = loadColor;
            dispatchEvent('data-changed', {
                requiredData: requiredData,
                missingData: getMissingData()
            });
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
        if (settings.programUuid == null) {
            settings.programUuid = generateUuid();
        }
        return settings.programUuid;
    };

    let stop = function () {
        settings = {
            programUuid: null,
            waterHardness: null,
            washingPowder: null,
            fabricConditioner: null,
            loadWeight: null,
            waterPressure: null,
            loadColor: null,
            loadType: null
        };
        dispatchEvent('data-changed', {
            requiredData: requiredData,
            missingData: getMissingData()
        });
        return true;
    };

    let init = function () {
        registerEvent('data-changed');
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

    // public
    return {
        init: init,
        setWaterHardness: setWaterHardness,
        setWashingPowder: setWashingPowder,
        setFabricConditioner: setFabricConditioner,
        setLoadType: setLoadType,
        setLoadColor: setLoadColor,
        loadType: loadType,
        loadColor: loadColor,
        getState: getState,
        state: state,
        getRequiredData: requiredData,
        getMissingData: getMissingData,
        getProgramUuid: getProgramUuid,
        stop: stop,
        addEventListener: addEventListener
    };

})();
