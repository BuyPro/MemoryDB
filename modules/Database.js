/*jslint node: true */
'use strict';

var Q = require("q"),
    Collection = require("./Collection"),
    Database = function (options) {
        var prop,
            i,
            len,
            table;

        options = options || {};

        //Default properties, override in options
        this.autoCollection = (options.autoCollection != null && options.autoCollection) || true;
        this.tables = {};

        options.tables = options.tables || [];
        len = options.tables.length;

        for (i = 0; i < len; i += 1) {
            table = options.tables[i];
            this.tables[table.name] = new Collection(table);
        }

//        for (prop in options) {
//            if (options.hasOwnProperty(prop)) {
//                this[prop] = options[prop];
//            }
//        }

        this.alias = {
            "create": this.create,
            "insert": this.create,
            "post": this.create,

            "read": this.read,
            "select": this.read,
            "get": this.read,

            "update": this.update,
            "patch": this.update,

            "remove": this.remove,
            "delete": this.remove
        };

        this.create = function (params) {

        };
        this.read = function (params) {

        };
        this.update = function (params) {};
        this.remove = function (params) {};
        this.query = function (params) {
            return this.alias[params.type](params);
        };
    };

module.exports = Database;
