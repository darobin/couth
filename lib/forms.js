
var fs = require("fs")
,   pth = require("path")
,   hb = require("handlebars")
;

var tmpl = function (name) { return fs.readFileSync(pth.join(__dirname, "hb/" + name + ".hb" ), "utf8"); }
,   formTmpl = hb.compile(tmpl("form"))
,   partials = "descend dispatch label hidden string number boolean object union array enum".split(" ")
;
for (var i = 0, n = partials.length; i < n; i++) hb.registerPartial(partials[i], tmpl(partials[i]));

exports.generate = function (schema, type) {
    // XXX
    //  reuse the same code to convert a schema to a more adapted structure
    //  feed the structure to the root template, normally it should be able
    //  to do all the rest using partials

    var path = []
    ,   root = []
    ,   curPath = function () {
            if (!path.length) return;
            var pth = path.concat([])
            ,   ret = pth.shift()
            ;
            for (var i = 0, n = pth.length; i < n; i++) {
                var p = pth[i];
                if (/^\[.*\]$/.test(p)) ret += p;
                else ret += "." + p;
            }
            return ret;
        }
    ,   isArray = function (obj) {
            return Object.prototype.toString.call(obj) === "[object Array]";
        }
    ,   toEnum = function (sch, cur) {
            if (!sch["enum"]) return;
            cur.subtype = cur.type;
            cur.type = "enum";
            cur.values = sch["enum"];
        }
    ,   processSchema = function (sch, fields, name) {
            if (name === "$type") return;
            var cur = {
                type:           sch.type || "any"
            ,   description:    sch.description || ""
            ,   required:       sch.required || false
            };
            var p = curPath();
            if (p) cur.path = p;
            if (name) cur.name = name;
            if (!sch.type || sch.type === "any") {
                // not sure what to do with these
                // maybe a simple key-value map, but it doesn't make much sense
                cur.type = "hidden";
            }
            else if (sch.type === "object") {
                cur.fields = [];
                for (var p in sch.properties) {
                    path.push(p);
                    processSchema(sch.properties[p], cur.fields, p);
                    path.pop();
                }
            }
            else if (sch.type === "array") {
                if (isArray(sch.items)) {
                    // XXX this can be handled, but later
                    console.log("XXX We don't yet support arrays of types");
                }
                else {
                    var items = [];
                    // XXX this only works one level deep
                    // when the need arises, we can make it work with parent scopes
                    // as well
                    path.push("[{{$index}}]");
                    processSchema(sch.items, items);
                    cur.items = items[0];
                    path.pop();
                }
                if (sch.minItems) cur.minItems = sch.minItems;
                if (sch.maxItems) cur.maxItems = sch.maxItems;
                if (sch.uniqueItems) cur.uniqueItems = sch.uniqueItems;
            }
            else if (sch.type === "string") {
                toEnum(sch, cur);
                cur.pattern = sch.pattern || false;
                // cur.minLength = sch.minLength || false; // XXX missing in HTML
                cur.maxLength = sch.maxLength || false;
            }
            else if (sch.type === "number") {
                toEnum(sch, cur);
                // XXX the exclusive options are not supported
                // though maybe with a range?
                cur.max = sch.maximum || false;
                cur.min = sch.minimum || false;
            }
            else if (sch.type === "boolean") {
                toEnum(sch, cur);
            }
            else if (sch.type === "null") {
                cur.type = "hidden";
            }
            else if (isArray(sch.type)) {
                cur.type = "union";
                cur.fields = [];
                for (var i = 0, n = sch.type.length; i < n; i++) processSchema(sch.type[i], cur.fields);
            }
            // Handlebars is stupid, so we do some fix up to help it
            cur["is" + cur.type[0].toUpperCase() + cur.type.substr(1)] = true;
            cur.id = type + "." + (cur.path || "__root");
            fields.push(cur);
        }
    ;
    processSchema(schema, root);
    root[0].fields.unshift({ type: "hidden", name: "_rev", path: "_rev", isHidden: true, id: type + "._rev" });
    root[0].fields.unshift({ type: "hidden", name: "_id", path: "_id", isHidden: true, id: type + "._id" });
    console.log(JSON.stringify(root[0], null, 4));
    return formTmpl(root[0]);
};


// {
//     "type": "object",
//     "description": "Specification",
//     "required": false,
//     "fields": [
//         {
//             "type": "hidden",
//             "name": "_id",
//             "path": "_id",
//             "isHidden": true,
//             "id": "spec._id"
//         },
//         {
//             "type": "hidden",
//             "name": "_rev",
//             "path": "_rev",
//             "isHidden": true,
//             "id": "spec._rev"
//         },
//         {
//             "type": "string",
//             "description": "Short name",
//             "required": true,
//             "path": "shortName",
//             "name": "shortName",
//             "pattern": false,
//             "maxLength": false,
//             "isString": true,
//             "id": "spec.shortName"
//         },
//         {
//             "type": "array",
//             "description": "Sources",
//             "required": false,
//             "path": "sources",
//             "name": "sources",
//             "items": {
//                 "type": "object",
//                 "description": "",
//                 "required": false,
//                 "path": "sources.[*]",
//                 "fields": [
//                     {
//                         "type": "string",
//                         "description": "URL",
//                         "required": true,
//                         "path": "sources.[*].url",
//                         "name": "url",
//                         "pattern": false,
//                         "maxLength": false,
//                         "isString": true,
//                         "id": "spec.sources.[*].url"
//                     },
//                     {
//                         "type": "enum",
//                         "description": "Type",
//                         "required": false,
//                         "path": "sources.[*].type",
//                         "name": "type",
//                         "subtype": "string",
//                         "values": [
//                             "html-spec",
//                             "respec-source",
//                             "respec-output"
//                         ],
//                         "pattern": false,
//                         "maxLength": false,
//                         "isEnum": true,
//                         "id": "spec.sources.[*].type"
//                     }
//                 ],
//                 "isObject": true,
//                 "id": "spec.sources.[*]"
//             },
//             "isArray": true,
//             "id": "spec.sources"
//         }
//     ],
//     "isObject": true,
//     "id": "spec.__root"
// }
