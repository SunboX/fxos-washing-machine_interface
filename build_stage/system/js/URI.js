wm.URI = (function () {

    'use strict';

    // class
    var URI = function (parts) {
        this.parts = parts;
    };

    // public
    URI.prototype.toString = function () {
        var query,
            parts = this.parts,
            result;

        if (this.protocol) {
            result = this.protocol + '://';
        } else {
            result = '//'; // No protocoll, use the Protocol-relative URL
        }

        if (parts.username) {
            result += parts.username + ':' + parts.password + '@';
        }

        result += parts.hostname;
        if (parts.port) {
            result += ':' + parts.port;
        }

        result += parts.pathname;

        if (parts.query) {
            if ('object' === typeof parts.query) {
                query = JSON.stringify(parts.query);
            } else {
                query = parts.query;
            }
            result += (query.charAt(0) === '?' ? '' : '?') + query;
        }

        if (parts.hash) {
            result += parts.hash;
        }

        return result;
    };

    var parseUri = function (str) {
        var o = parseUri.options,
            m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str),
            uri = {},
            i = 14;

        while (i--) {
            uri[o.key[i]] = m[i] || '';
        }

        uri[o.q.name] = {};
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) {
                uri[o.q.name][$1] = $2;
            }
        });

        return new URI(uri);
    };

    parseUri.options = {
        strictMode: false,
        key: [
            'source',
            'protocol',
            'authority',
            'userInfo',
            'username',
            'password',
            'hostname',
            'port',
            'relative',
            'pathname',
            'directory',
            'file',
            'query',
            'hash'
        ],
        q: {
            name: 'queryKey',
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    };

    var serialize = function (obj, prefix) {
        var str = [];
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                var k = prefix ? prefix + '[' + p + ']' : p,
                    v = obj[p];
                str.push(typeof v == 'object' ?
                    serialize(v, k) :
                    encodeURIComponent(k) + '=' + encodeURIComponent(v));
            }
        }
        return str.join("&");
    };

    // static
    URI.parse = parseUri;
    URI.serialize = serialize;

    return URI;

})();