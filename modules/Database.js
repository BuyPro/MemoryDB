/*jslint node: true */
'use strict';

var Q = require("q"),
    Database = function (options) {
        var prop;

        //Default properties, override in options
        this.autoCollection = true;

        for (prop in options) {
            if (options.hasOwnProperty(prop)) {
                this[prop] = options[prop];
            }
        }

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

        this.create = function (params) {};
        this.read = function (params) {

        };
        this.update = function (params) {};
        this.remove = function (params) {};
        this.query = function (params) {
            return this.alias[params.type](params);
        };
    };

module.exports = Database;
