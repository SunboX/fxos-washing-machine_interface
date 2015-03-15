wm.WashingProgramHistory = (function () {

    'use strict';

    let programUuids = [];

    let loadProgramUuids = function () {
        let storedEntity = simpleStorage.get('wm.ProgramUuids');
        if (storedEntity) {
            programUuids = storedEntity;
        }
    }

    let saveProgramUuids = function () {
        simpleStorage.set('wm.ProgramUuids', programUuids);
    };

    let getProgramByIndex = function (index) {
        if (index < 0) {
            index += programUuids.length;
        }
        if (index >= programUuids.length - 1) {
            return programUuids.length[index];
        }
        return null;
    };

    let getProgramByUuid = function (uuid) {
        let storedEntity = simpleStorage.get('wm.Program.' + uuid);
        if (storedEntity) {
            return storedEntity;
        }
        return null;
    };

    let addProgram = function (program) {
        programUuids.push(program.programUuid);
        saveProgramUuids();
        simpleStorage.set('wm.Program.' + program.programUuid, program);
    };

    let init = function () {
        loadProgramUuids();
    };

    // public
    return {
        init: init,
        getProgramByIndex: getProgramByIndex,
        getProgramByUuid: getProgramByUuid,
        addProgram: addProgram
    };

})();