/*jslint node: true */
'use strict';

var Q = require("q"),
    Collection = require("./Collection"),
    jsn = require("bp-utilities").jsn,
    Database = function (options) {
        var prop,
            i,
            len,
            table,
            self = this;

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

        this.ensureTablesExist = function (tableNames) {
            var i,
                len = tableNames.length,
                cur;

            for (i = 0; i < len; i += 1) {
                cur = tableNames[i];
                if (!this.tables.hasOwnProperty(cur)) {
                    if (this.autoCollection) {
                        // Implicit tables are created without a model
                        this.tables[cur] = new Collection();
                    } else {
                        throw new ReferenceError("Table `" + cur + "` does not exist in database and will not be created");
                    }
                }
            }
        };

        this.extractQueryValues = function (query) {
            var values = query.values || {},
                tables = query.tables || {},
                keys,
                keySplit,
                queries = {},
                i,
                len,
                cur,
                defer = [];

            len = tables.length;
            for (i = 0; i < len; i += 1) {
                queries[tables[i]] = {values: {}};
            }

            keys = jsn.keys(values);
            keySplit = keys.map(function (e) {return e.split("."); });

            len = keySplit.length;
            for (i = 0; i < len; i += 1) {
                cur = keySplit[i];
                if (cur.length === 1) {
                    defer.push(keys[i]);
                } else {
                    if (!queries.hasOwnProperty(cur[0])) {
                        throw new ReferenceError("Attempt to access undefined table `" + cur[0] + "` in query; " + JSON.stringify(query));
                    }
                    queries[cur[0]].values[cur[1]] = values[keys[i]];
                }
            }

            len = defer.length;
            for (i = 0; i < len; i += 1) {
                for (cur in queries) {
                    if (queries.hasOwnProperty(cur)) {
                        queries[cur].values[defer[i]] = values[defer[i]];
                    }
                }
            }
            return queries;
        };
        this.extractQueryConditions = function (query) {
            var where = query.where || [],
                tables = query.tables || {},
                keys,
                keySplit,
                queries = {},
                i,
                len,
                indx,
                cur,
                defer = [];

            len = tables.length;
            for (i = 0; i < len; i += 1) {
                queries[tables[i]] = {where: []};
            }

            keys = where.map(function (e) {return e.value; });
            keySplit = keys.map(function (e) {return e.split("."); });

            len = keySplit.length;
            for (i = 0; i < len; i += 1) {
                cur = keySplit[i];
                if (cur.length === 1) {
                    defer.push(i);
                } else {
                    if (!queries.hasOwnProperty(cur[0])) {
                        throw new ReferenceError("Attempt to access undefined table `" + cur[0] + "` in query; " + JSON.stringify(query));
                    }
                    indx = queries[cur[0]].where.push(jsn.copy(where[i]));
                    queries[cur[0]].where[indx - 1].value = cur[1];
                }
            }

            len = defer.length;
            for (i = 0; i < len; i += 1) {
                for (cur in queries) {
                    if (queries.hasOwnProperty(cur)) {
                        queries[cur].where.push(where[i]);
                    }
                }
            }
            return queries;
        };
        this.mergeQueryParts = function (values, conditions) {
            var prop,
                result = {};
            for (prop in values) {
                if (values.hasOwnProperty(prop)) {
                    if (conditions.hasOwnProperty(prop)) {
                        result[prop] = {values: values[prop], where: conditions[prop]};
                    }
                }
            }

            for (prop in conditions) {
                if (conditions.hasOwnProperty(prop)) {
                    if (values.hasOwnProperty(prop)) {
                        result[prop] = {values: values[prop], where: conditions[prop]};
                    }
                }
            }
            return result;
        };
        this.splitQueryToTables = function (query) {
            var vals = this.extractQueryValues(query),
                conditions = this.extractQueryConditions(query);
            return this.mergeQueryParts(vals, conditions);
        };

        this.create = function (query, callback) {
            console.log(this);
            var queries = this.splitQueryToTables(query),
                tables = jsn.keys(queries),
                results = 0,
                i,
                len = tables.length,
                cur;
            try {
                for (i = 0; i < len; i += 1) {
                    cur = tables[i];
                    results += this.tables[cur].create(queries[cur]).modified;
                }
            } catch (e) {
                callback(e, null);
                return;
            }
            callback(null, {modified: results});
        };
        this.read = function (query, callback) {
            var queries = this.splitQueryToTables(query),
                tables = jsn.keys(queries),
                ret,
                results = {},
                i,
                len = tables.length,
                cur;
            try {
                for (i = 0; i < len; i += 1) {
                    cur = tables[i];
                    ret = this.tables[cur].read(queries[cur]);
                    results.modified += ret.modified;
                    results[cur] = ret.data;
                }
            } catch (e) {
                callback(e, null);
                return;
            }
            callback(null, results);
        };
        this.update = function (query, callback) {
            var queries = this.splitQueryToTables(query),
                tables = jsn.keys(queries),
                results = 0,
                i,
                len = tables.length,
                cur;
            try {
                for (i = 0; i < len; i += 1) {
                    cur = tables[i];
                    results += this.tables[cur].update(queries[cur]).modified;
                }
            } catch (e) {
                callback(e, null);
                return;
            }
            callback(null, {modified: results});
        };
        this.remove = function (query, callback) {
            var queries = this.splitQueryToTables(query),
                tables = jsn.keys(queries),
                results = 0,
                i,
                len = tables.length,
                cur;
            try {
                for (i = 0; i < len; i += 1) {
                    cur = tables[i];
                    results += this.tables[cur].remove(queries[cur]).modified;
                }
            } catch (e) {
                callback(e, null);
                return;
            }
            callback(null, {modified: results});
        };

        this.alias = {
            "create": self.create,
            "insert": self.create,
            "post": self.create,

            "read": self.read,
            "select": self.read,
            "get": self.read,

            "update": self.update,
            "patch": self.update,

            "remove": self.remove,
            "delete": self.remove
        };

        this.query = function (params, callback) {
            this.ensureTablesExist(params.tables);
            return this.alias[params.type].bind(this)(params, callback);
        };
    };

module.exports = Database;
