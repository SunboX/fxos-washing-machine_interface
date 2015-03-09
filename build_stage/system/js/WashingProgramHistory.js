wm.WashingProgramHistory = (function () {

    var programUuids = [];

    var loadProgramUuids = function () {
        var storedEntity = simpleStorage.get('wm.ProgramUuids');
        if (storedEntity) {
            programUuids = storedEntity;
        }
    }

    var saveProgramUuids = function () {
        simpleStorage.set('wm.ProgramUuids', programUuids);
    };

    var getProgramByIndex = function (index) {
        if (index < 0) {
            index += programUuids.length;
        }
        if (index >= programUuids.length - 1) {
            return programUuids.length[index];
        }
        return null;
    };

    var getProgramByUuid = function (uuid) {
        var storedEntity = simpleStorage.get('wm.Program.' + uuid);
        if (storedEntity) {
            return storedEntity;
        }
        return null;
    };

    var addProgram = function (program) {
        programUuids.push(program.programUuid);
        saveProgramUuids();
        simpleStorage.set('wm.Program.' + program.programUuid, program);
    };

    var init = function () {
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