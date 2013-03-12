var Couth =     require("./core").Couth
;

Couth.prototype.couthUserRoutes = function () {
    // NOTE: this requires secure_rewrites to be set to false
    var sessionDB = "../../../_session";
    this.addRewrite("couth/session", sessionDB, "GET");
    this.addRewrite("couth/login", sessionDB, "POST");
    this.addRewrite("couth/logout", sessionDB, "DELETE");
    this.addRewrite("couth/signup/*", "../../../_users/*", "PUT");
};
