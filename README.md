# MemoryDB

MemoryDB arose from the need to have a database style object that supported CRUD 
operations, querying and the idea of large datasets without necessarily possessing 
the ability to not catch fire when presented with such. Another facet of this module
is support for a promise interface in addition to the traditional Node.js callback style
of control flow.

MemoryDB can be installed by running `npm install --save bp-memory-db`

NB: Table and Collection are not used interchangably in this document. Collection refers
to the interface and abstract concepts, whereas Table refers to a concrete instance of
Collection.

## Creating a Database

To use this module, you will first need to include it and call the constructor to get a 
new Database instance. The constructor takes a single `options` object that can currently
contain two options. The first is `autoCollection`, which will automatically create a 
blank version of every table in a query if it does not already exist when set to `true`. 
If this option is set to `false`, the Database will throw an error if the user attempts 
to query a non-existent table.

The second option is `tables`, which is simply an array of table definitions. A table 
definition is an object with a `name` and a `model`. The `name` of a table is the string
that will be used in queries to refer to it, and _should not_ contain a period, as the
period is used to identify context in multi-table queries (see below).

A table model defines the expected data, and a default value to be used in case a
particular element is not provided in a CREATE query, in the following format:

```JSON
{
    "key1": "value1",
    "key2": null,
    "key3": 1234
}
```

In practice, creating a database is very simple. The following is all you need to create
the most basic database (No models, create tables implicitly):

```Javascript
var Database = require("bp-memory-db"),
    db = new Database();    // Defaults to autoCollection: true
                            // and model: {}
```

## Queries

### Functions

Before getting to the subject of how to make a query (there are two different ways to do so),
it's easier to talk about the structure of a query, as that is the same across both querying
methods.

The database supports four functions on sets of data; each of the CRUD functions. Each
function also has a number of aliases that refer to either to a common alternative
(INSERT -> CREATE, SELECT -> READ) or a workaround to not use a javascript reserved
word (REMOVE -> DELETE). The full list of current aliases:

```Javascript
alias = {
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
```
### Structure

Every query follows the same parameter structure where you define the type of query 
you are going to make, the tables that you will be working with, the values you are 
interested in and the conditions used to select the particular entries of interest.
Future versions will also support reduce functions. An example of a direct query
object (See below) would be

```Javascript
{
  type: "read",
  tables: [
    "person",
    "country"
  ],
  values: {
    "person.name": null,
    "person.age": 0,
    "country.name": null
  },
  where: [
    {
      value: "person.age",
      operator: "gt",
      operand: 18
    },
    {
      value: "country.name",
      operator: "eq",
      operand: "France"
    }
  ]
}
```

* `type: (String)` - The name of the function that is being used
* `tables: (Array<String>)` - A list of the tables being used. If one or more of these doesn't exist, the value of `autoCollection` is checked. If `autoCollection` is true, the table is created with default parameters, otherwise a `ReferenceError` is thrown.
* `values: (Object)` - An object that contains the keys to retrieve from the dataset, and default values to use in case a particular entry does not have that property
* `where: (Array<Object>)` - An array of objects, each of which defines an individual condition to filter the results by. A condition has a `value` containing the (fully-qualified in the case of multi-table queries) field name, an `operator` containing one of `eq`, `gt`, `gte`, `lt`, `lte` or `fn` to define the constraint applied to the data (===, >, >=, <, <=, fn.call respectively) and an `operand` that will function as the right hand side of the operator (or the function being called, in the case of `fn`)

Not all of these parameters are required for every type of query, the following table defines which must be included:

Param | CREATE | READ | UPDATE | DELETE
------|--------|------|--------|------------
tables | Required | Required | Required | Required
values | Required | Optional (Will return all if absent) | Required | Unused
where | Unused | Optional (Will return entire dataset if absent) | Optional (Will modify every element if absent) | Optional (Will delete entire dataset, though not the table, if absent)

### Multi-table Queries

Queries will be split up and run across more than one table if more than one is specified. In order to differentiate between parameters meant for different tables, a fully qualified multi-table key will be prefixed with the table name, like so: `table.value: "catfish"`. If the table has not been declared in the tables paramater of the query, then any values prefixed with the undeclared table's name will be ignored. Conversely, if a value is not given a prefix at all (e.g. the previous example was simply `value: "catfish"`) then that parameter will be applied to _every_ table in the query

## Direct Queries Vs Eventual Queries

There are two methods of running queries against the database. They run operations identically - in fact, Eventual queries are basically syntactic sugar on top of a Direct query, but also offer certain facilities that Direct queries currently do not.

### Direct Queries

These are the simplest to perform. You simply need to call the `.exec(query, callback)` function of a `Database` instance, where `query` is an object structured like the example in the Structure section above and `callback` is a function with the signature `function(err, data)`. 

The `err` parameter for `callback` will be null if the query was successful, or the Error that was thrown if the query failed. `data` is an object that will always contain the key `modified`, dictating how many entries were affected or retrieved. In the case of a `read`, it will also contain an array for every table that was queried, where each element in the array is an object containing the values defined in the original query object.

Example:

```Javascript
var Database = require("bp-memory-db"),
    db = new Database({
      autoCollection: false,
      tables: [
        {
          name: "people", 
          model: {
            name: null, 
            age: -1, 
            ssn: -1
          }
        }, 
        {
          name: "cities", 
          model: {
            name: null, 
            population: 0
          }
        }
      ]
    });
    
db.exec({
  type: "create", 
  tables: ["people"], 
  values: {
    name: "pepe", 
    age: 21, 
    ssn: 12345123131236
  }
}, console.log);
// Null {modified: 1}
```

### Eventual Queries

Eventual queries could be considered a deffered version of a Direct query, and can be conceptualised as a sort of data-dump, where it is given data that it will process and use in its own way. It is used by retrieving a `Query` instance from a `Database` instance with `db.query([type][, tables])`. You then call methods of this `Query` object to build up a query, that is then executed. Every method is chainable, so an eventual query can be created and executed in a single line if that is desired.

The `type` and `tables` parameters of the constructor correspond to the parameters from the previous query object, and either or both can be omitted and defined later. All of the query properties can be added in any order, as and when it is convenient. This means that the `Query` object can be passed around various other modules in the program before being executed. It can even be stored in the database and retrieved and executed later (hence the name Eventual Query), and keeps a reference to the `Database` that created it so that it can be executed wherever.

With the exception of the `.type(typeName)` and `.callback(fn)` methods, each parameter has both a singular and plural version to accept one or more of that parameter, where the method name corresponds to the parameter name.

The query is finally executed with the `.exec()` method, which return a [Q promise](http://documentup.com/kriskowal/q/), as well as passing the appropriate data to any callbacks that were specified.

The Direct example using Eventual queries:

```Javascript
var Database = require("bp-memory-db"),
    db = new Database({
      autoCollection: false,
      tables: [
        {
          name: "people", 
          model: {
            name: null, 
            age: -1, 
            ssn: -1
          }
        }, 
        {
          name: "cities", 
          model: {
            name: null, 
            population: 0
          }
        }
      ]
    });
db.query("create")
  .table("people")
  .values({
    name: "pepe",
    age: 21,
    ssn: 12345123131236
  })
  .callback(console.log)
  .exec();
// Null {modified: 1}
```