/*jslint node: true, nomen: true */
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
        }
    },
    unwrap = function (where) {
        return function (e) {
            return operations[where.operator](where.operand, e[where.value]);
        };
    },
    Collection = function (options) {
        options = options || {};

        this.data = [];
        this.idGen = new Sequence();
        this.model = options.model || {};

        this.create = function (datum) {
            var newEntry = jsn.copy(this.model),
                entries = this.data.length;
            newEntry._id = this.idGen.next();
            return {modified: Math.abs(this.data.push(jsn.merge(newEntry, datum)) - entries)};
        };

        this.read = function (params) {
            var dataset = [],
                filtered = this.data,
                vals = params.values,
                valKeys = jsn.keys(vals),
                cur,
                i,
                len = params.where.length;
            for (i = 0; i < len; i += 1) {
                cur = params.where[i];
                filtered = filtered.filter(unwrap(cur));
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

        this.update = function (params) {};

        this.remove = function (params) {};

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
