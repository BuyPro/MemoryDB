/*jslint node: true, nomen: true, plusplus: true */
'use strict';

var Q = require("q"),
    Sequence = require("bp-utilities").Sequence,
    jsn = require("bp-utilities").jsn,
    operations = {
        eq: function (b, a) {
            return a === b;
        },
        lt: function (b, a) {
            return a < b;
        },
        lte: function (b, a) {
            return a <= b;
        },
        gt: function (b, a) {
            return a > b;
        },
        gte: function (b, a) {
            return a >= b;
        },
        fn: function (func, a) {
            return func.call(null, a);
        }
    },
    filtr = function (where) {
        return function (e) {
            return operations[where.operator](where.operand, e[where.value]);
        };
    },
    matchAll = function (tests, data) {
        var i,
            len = tests.length,
            cur;
        for (i = 0; i < len; i += 1) {
            cur = tests[i];
            if (!filtr(cur)(data)) {
                return false;   // Not returning filtr(cur)(data) directly because all
            }                   // tests need to resolve to true to return true
        }
        return true;
    },
    Collection = function (options) {
        options = options || {};

        this.data = [];
        this.idGen = options.idGen || new Sequence();
        this.model = options.model || {};

        this.create = function (datum) {
            var newEntry = jsn.copy(this.model),
                entries = this.data.length;
            newEntry._id = this.idGen.next();
            return {modified: Math.abs(this.data.push(jsn.merge(newEntry, datum)) - entries)};
        };

        this.read = function (params) {
            //Params is optional;   naked function call will return the values
            //                      defined in the model for all entries
            var param = params || {};
            param.values = params.values || this.model;
            param.where = params.where || [];

            var dataset = [],
                filtered = this.data,
                vals = param.values,
                valKeys = jsn.keys(vals),
                cur,
                i,
                len = param.where.length;
            for (i = 0; i < len; i += 1) {
                cur = param.where[i];
                filtered = filtered.filter(filtr(cur));
            }
            len = filtered.length;
            for (i = 0; i < len; i += 1) {
                cur = filtered[i];
                cur = jsn.filter(cur, valKeys);
                cur = jsn.merge(jsn.copy(vals), cur);
                dataset.push(cur);
            }

            return {modified: dataset.length, data: dataset};
        };

        this.update = function (params) {
            if (!params.values) {
                throw new SyntaxError("Database update needs values to update. Provided Query: " + JSON.stringify(params));
            }
            if (!params.where) {
                throw new SyntaxError("Database update needs where clause. Provided Query: " + JSON.stringify(params));
            }
            var i,
                modified = 0,
                len = this.data.length,
                cur;
            for (i = 0; i < len; i += 1) {
                cur = this.data[i];
                if (matchAll(params.where, cur)) {
                    this.data[i] = jsn.merge(this.data[i], params.values);
                    modified += 1;
                }
            }
            return {modified: modified};
        };

        this.remove = function (params) {
            var modified = 0,
                i,
                cur;
            if (!params.where) {
                modified = this.data.length;
                this.data = [];
            } else {
                i = this.data.length;
                while (i--) {
                    if (matchAll(params.where, this.data[i])) {
                        this.data.splice(i, 1);
                        modified += 1;
                    }
                }
            }
            return {modified: modified};
        };

    };

Collection.test = function () {
    var ret = new Collection();
    ret.create({name: "greg", age: 7});
    ret.create({name: "greg", age: 17});
    ret.create({name: "greg", age: 25, ssn: 102392019283});
    ret.create({name: "charlene", age: 27, ssn: 1023928102382});
    ret.create({name: "bertram", age: 9});
    return ret;
};

module.exports = Collection;
