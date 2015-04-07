/*jslint node: true */
'use strict';

var Database = require("./Database"),
    Q = require("q"),
    jsn = require("bp-utilities").jsn,
    Query = function (context, type, tables) {
        if (!(context instanceof Database)) {
            throw new ReferenceError("Query context must be a database object");
        }

        this.context = context;
        this.defer = Q.defer();
        this.result = null;

        if (type) {
            if (type instanceof String || typeof type === 'string') {
                this.typedef = type;
                if (tables && tables.push) {
                    this.tableList = tables;
                }
            } else if (type.length && type.push) {
                this.typedef = null;
                this.tableList = tables;
            }
        } else {
            this.typedef = null;
            this.tableList = [];
        }

        this.valueObj = {};
        this.whereList = [];
        this.collationObj = {};
        this.callbackfunc = null;

        this.type = function (type) {
            this.typedef = type;
            return this;
        };

        this.table = function (tableName) {
            this.tableList.push(tableName);
            return this;
        };
        this.tables = function (tableList) {
            this.tableList.concat(tableList);
            return this;
        };

        this.value = function (key, val) {
            var o = {};
            o[key] = val;
            jsn.merge(this.valueObj, o);
            return this;
        };
        this.values = function (val) {
            jsn.merge(this.valueObj, val);
            return this;
        };

        this.where = function (condition) {
            this.wheres.push(condition);
            return this;
        };
        this.wheres = function (conditions) {
            this.whereList = this.whereList.concat(conditions);
            return this;
        };

        this.callback = function (callback) {
            this.defer.promise.then(
                callback.bind(callback, null),
                callback
            );
            return this;
        };

        this.exec = function () {
            var self = this;
            context.exec({
                type: this.typedef,
                tables: this.tableList,
                values: this.valueObj,
                where: this.whereList,
                collate: this.collationObj
            }, function (err, data) {
                if (err) {
                    self.defer.reject(err);
                } else {
                    self.defer.resolve(data);
                }
            });

            return this.defer.promise;
        };

        return this;
    };
