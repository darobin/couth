
var fs = require("fs")
,   pth = require("path")
,   hb = require("handlebars")
;

var tmpl = function (name) { return fs.readFileSync(pth.join(__dirname, "hb/" + name + ".hb" ), "utf8"); }
,   formTmpl = hb.compile(tmpl("form"))
,   partials = "descend dispatch label hidden string number boolean object union array enum".split(" ")
;
for (var i = 0, n = partials.length; i < n; i++) hb.registerPartial(partials[i], tmpl(partials[i]));

// TODO
//  - styling
//      - don't use floats, use relative positioning and our own styles
//      - for arrays, we could probably use a grid actually
//      - legends inside legends

// LATER:
//  - add error content (use arbitrary @name, otherwise it's a mess)
//  - add multiple form types
//  - new types: html, email, date, attachment
//  - maybe switch to doT http://olado.github.com/doT/index.html

exports.generate = function (schema, type) {
    var path = ["$couthInstance"]
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
            var cur = {
                type:           sch.type || "any"
            ,   description:    sch.description || ""
            ,   required:       sch.required || false
            ,   emptyType:      sch.type
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
                    path.push("[$index]");
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
                // XXX
                // Note that JSV accepts ["string", "number"] here, but we don't support that yet
                for (var i = 0, n = sch.type.length; i < n; i++) processSchema(sch.type[i], cur.fields);
                cur.emptyType = sch.type[0].type;
            }
            if (name === "$type") {
                cur.type = "hidden";
                cur.required = true;
                cur.value = sch["enum"][0];
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
    return formTmpl(root[0]);
};
