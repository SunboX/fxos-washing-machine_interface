wm.Event = (function () {

    'use strict';

    let Event = function (name) {
        this.name = name;
        this.callbacks = [];
    }

    Event.prototype.registerCallback = function (callback) {
        this.callbacks.push(callback);
    }

    return Event;

})();
