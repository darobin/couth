var Couth =     require("./core").Couth
;

Couth.prototype.couthUserRoutes = function () {
    // NOTE: this requires secure_rewrites to be set to false
    var sessionDB = "../../../_session";
    this.addRewrite("couth/session", sessionDB, "GET");
    this.addRewrite("couth/login", sessionDB, "POST");
    this.addRewrite("couth/logout", sessionDB, "DELETE");
    this.addRewrite("couth/signup/*", "../../../_users/*", "PUT");
    
    // note that it's also worth checking if the client API knows how to handle
    // names with a hyphen -> CouthUsers
    if (this.conf.exposeUsers) {
        this.addRewrite("couth-users/*", "../../../_users/*", "GET");
        this.addRewrite("couth-users/", "../../../_users/_all_docs", "GET", {
            startkey:       "org.couchdb.user:"
        ,   endkey:         "org.couchdb.userz"
        ,   include_docs:   true
        });
        // http://deploy.berjon.dev/_users/_all_docs?startkey=%22org.couchdb.user:%22&endkey=%22org.couchdb.userz%22&include_docs=true
    }
};
