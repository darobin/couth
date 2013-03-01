/*global provides send getRow*/

var _ = require("underscore")
;

// helpers
function makeView (type, id) {
    return {
        map:    "function (doc) {\n" +
                "    return require('views/lib/utils').viewFor('" + type + "', '" + id + "', doc, emit);\n" +
                "}\n"
    };
}

function makeList (perm) {
    return "function (head, req) {\n" +
           "    return require('lib/utils').listFor(head, req, '" + perm + "', provides, send, getRow);\n" +
           "}";
}

function makeUpdate () {
    return function (doc, req) {
                return require("lib/utils").updateFor(doc, req);
           }.toString();
}

function makeRead () {
    return function (head, req) {
                return require("lib/utils").showFor(head, req, provides, send, getRow);
           }.toString();
}

function makeDelete () {
    return function (doc, req) {
                return require("lib/utils").deleteFor(doc, req);
           }.toString();
}

function Type (name) {
    this.name = name;
    this.schema({});
    this.perms = {
        create: "*"
    ,   read:   "*"
    ,   update: "*"
    ,   del:    "*"
    };
    this.crudOptions = {};
}

Type.prototype = {
    schema: function (sch) {
        if (!sch) return this.jsonSchema;
        if (sch.type && sch.type !== "object") throw new Error("The root schema type has to be 'object'.");
        if (!sch.properties) sch.properties = {};
        if (!sch.properties.couthType) sch.properties.couthType = { type: "string", "enum": [this.name], "required": true };
        this.jsonSchema = sch;
        return this;
    }
,   permissions: function (perms) {
        if (!perms) return this.perms;
        this.perms = _.extend(this.perms, perms);
        return this;
    }
,   crudify: function (opts) {
        if (!opts) return this.crudOptions;
        var name = this.name;
        
        // paths
        if (!opts.paths) opts.paths = {};
        //  list        GET     /name/
        if (!opts.paths.list) opts.paths.list = "/" + name;
        //  create      POST    /name/create
        if (!opts.paths.create) opts.paths.create = "/" + name + "/create";
        //  read        GET     /name/:key or /name/:id
        if (!opts.paths.read) opts.paths.read = "/" + name + "/:key";
        //  update      PUT     /name/:id
        if (!opts.paths.update) opts.paths.update = "/" + name + "/*";
        //  delete      DELETE  /name/:id
        if (!opts.paths.del) opts.paths.del = "/" + name + "/*";
        
        if (!opts.id) opts.id = "_id";
        this.crudOptions = opts;
        return this;
    }
,   deploy: function (couth, ddoc) {
        // add self to design document
        if (!ddoc.types) ddoc.types = {};
        ddoc.types[this.name] = {
            schema:         this.jsonSchema
        ,   permissions:    this.perms
        };
        
        // --- Create the requisite paths
        var opts = this.crudOptions
        ,   viewName = this.name + "." + opts.id
        ;
        // view
        ddoc.views[viewName] = makeView(this.name, opts.id);
        
        // list
        ddoc.lists[viewName] = makeList(this.perms.read);
        couth.addRewrite(opts.paths.list,
                        "_list/" + viewName + "/" + viewName + "/",
                        "GET",
                        { include_docs: true }
        );
        
        // create & update
        ddoc.updates[this.name] = makeUpdate();
        couth.addRewrite(opts.paths.create,
                        "_update/" + this.name + "/",
                        "POST");
        couth.addRewrite(opts.paths.update,
                        "_update/" + this.name + "/*",
                        "PUT");
        
        // read
        var renderKey = viewName + ".render";
        ddoc.lists[renderKey] = makeRead();
        couth.addRewrite(opts.paths.read,
                        "_list/" + renderKey + "/" + viewName,
                        "GET",
                        { include_docs: true });
        
        // delete
        var delKey = this.name + ".delete";
        ddoc.updates[delKey] = makeDelete();
        couth.addRewrite(opts.paths.del,
                        "_update/" + delKey + "/*",
                        "DELETE");
        return this;
    }
,   resourceAPI:    function () {
        var ret = {
            name:           this.name[0].toUpperCase() + this.name.substr(1)
        ,   path:           "/" + this.name + "/:id"
        ,   paramDefaults:  {}
        ,   actions:    {
                list:   {
                    method: "GET"
                ,   params: { id: "" }
                }
            ,   create: {
                    method: "POST"
                ,   params: { id: "create" }
                }
            ,   read: {
                    method: "GET"
                ,   params: { id: "@" + this.crudOptions.id }
                }
            ,   update: {
                    method: "PUT"
                ,   params: { id: "@_id" }
                }
            ,   "delete": {
                    method: "DELETE"
                ,   params: { id: "@_id" }
                }
            }
        };
        return ret;
    }
};

module.exports = Type;
