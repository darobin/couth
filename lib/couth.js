
var Couth = require("./core").Couth;
require("./deploy");
require("./server");
require("./design");
require("./static");
require("./type");
require("./resources");
require("./users");

module.exports = function () {
    return new Couth();
};
