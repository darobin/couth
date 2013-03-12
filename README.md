
# Couth

Couth is a new take on the CouchApp concept (Couch Apps being web applications that
are stored and run completely off CouchDB). It has a specific focus on doing as much
as possible based on as little information as possible, and on making CRUD applications
particularly quick to create with full bells and whistles.

Given little more than a [Web Schema](https://github.com/darobin/web-schema), it will:

* Handle validation
* Generate basic views
* Generate a full set of CRUD endpoints
* Support JSON-P in addition to JSON
* Expose login/logout/signup functionality
* Handle basic permissions for users editing content
* Handle all the Couch configuration, including vhost, rewrites, session, etc so you
  don't have to
* Generate a form to create and edit the relevant objects
* Generate a client side API to access the CRUD backend easily
* Provide various paraphernalia for AngularJS apps

Couth is somewhat opinionated, but not completely. If you are planning to use 
[AngularJS](http://angularjs.org/) and [Bootstrap](http://twitter.github.com/bootstrap/)
your life will be much easier. But you can use something else instead if you want to do
more of the work yourself.

I am well aware that there are plenty of other CouchApp systems out there. I built this
one because none of them suited me.

## Example Application

The example application below is a simple book list. Below you have the core app.js
file, but you should look inside the `example/` directory for the complete story.

    var couth = require("couth")
    ,   app = couth()
    ;

    app
        .deployTo("http://deploy.books.dev/")
        .auth({ username: "you", password: "secret" })
        .vhost("books.dev")
        .db("mybooks")
        .index("/index.html")
        .webAppRoot("/app/")
        .addStaticDir("static")
    ;

    app.type("books")
        .schema({
            type:           "object"
        ,   description:    "Book"
        ,   properties: {
                title:          {
                    type:           "string"
                ,   description:    "Title"
                ,   required:       true
                }
            ,   isbn: {
                    type:           "string"
                ,   description:    "ISBN"
                ,   pattern:        "\\d{3}-\\d-\\d\\d-\\d{6}-\\d"
                }
            ,   authors:    {
                    type:           "array"
                ,   description:    "Authors"
                ,   items:  {
                        type:       "object"
                    ,   properties: {
                            name:   { type: "string", required: true }
                        }
                    }
                }
            ,   etAl:   { type: "boolean", description: "Et al." }
            }
        })
        .permissions({
            create: "logged"
        ,   update: "logged"
        ,   del:    "admin"
        })
        .crudify({ jsonp: true })
    ;

    // process command line options and deploy
    app
        .cli()
        .deploy(function (err) {
            console.log(err ? "BAD!" : "ALL OK!");
        })
    ;

## API

### `couth()`

Creates an instance application. All usage of `app` below refers to the result from that

### `app.debug([boolean])`, `app.silent([boolean])`

Get or set the debug and silent (no logging) statuses. It is probably more convenient to 
control this on the command line.

### `app.all()`, `app.dev()`, `app.prod()`, `app.test()`

Sets the target to which the configuration calls that follow apply. This allows you to
have different configurations per target environment. For instance, to use a different
vhost in production:

    app
        .all().vhost("mysite.dev")
        .prod().vhost("mysite.com");

### Configuration methods

The following methods are available for configuration. They all accept a value to set,
and return a value if they no parameter. Otherwise they return `this` so as to be chainable.

* `app.deployTo(URL)`. The URL (including only scheme and hostname) to the deployment endpoint.
  There are two important endpoints in Couth: the deployment endpoint and the vhost endpoint, and
  it's important to understand the difference. In order to expose nice URLs instead of CouchDB's
  own rather ugly ones, we rely on CouchDB's URL rewriting functionality. This means that all
  requests to http://vhost/ are internally mapped to http://vhost/yourDB/_design/couth/_rewrite/.
  Having nice URLs is great, but once those rewrites have been set up, Couth can no longer 
  communicate with CouchDB at the vhost endpoint since all the paths it needs to do so have been
  rewritten.
  This is why the deployment endpoint exists: it is a different hostname mapping to the *same*
  CouchDB instance such that the rewriter is not triggered (the rewriter keys off the hostname).
* `app.vhost(hostname)`. The hostname for the vhost endpoint, as explained above. This is the address
  at which you want your site to be running.
* `app.port(integer)`. The port to use for the deployment endpoint (for the vhost endpoint) it doesn't
  matter to Couth).
* `app.auth({ username: "you", password: "secret" })`. Sets the authentication credentials that may
  be needed to deploy to CouchDB.
* `app.db(string)`. The name of the database you wish to use. This is not user visible and so not
  very important. CouchDB can be quite particular about what it accepts here, so you should probably
  stick to alphanumerics and begin with a letter.
* `app.index(path)`. Sets what accessing the root of the site will show. For instance, if you have
  a static file called `index.html` you can call `app.index("index.html")` to use that. But it can
  equally well be anything at all that you have added to your Couth deployment.
* `app.webAppRoot(path)`. If you are developing an app that uses the History API you will want the path
  you use with your routing to start with a recognisable prefix so that it can be distinguished from
  resources that are meant to be obtained from the server. For instance, the example application sets
  `app.webAppRoot("/app/")` and then uses routes that begin with `http://books.dev/app/`, e.g.
  `http://books.dev/app/books`. Thanks to this option, if you load the previous URL, Couth will recognise
  that this URL is controlled by the web app and will return the index page instead of trying to
  find a resource.
* `app.session(integer)`. The number of seconds that a user session lasts. CouchDB has this ridiculously
  low (10 minutes), Couth ups that to 90 days.



### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``


,   resolve:    function (target) {
        var target = target || this.conf.target
        ,   targets = "all dev prod test".split(" ")
        ;
        var ret = _.extend(this.conf, this.conf.all, this.conf[target]);
        ret.target = target;
        for (var i = 0, n = targets.length; i < n; i++) delete ret[targets[i]];
        if (ret.deployTo === ret.vhost)
            throw new Error("You should not use the same host for deployTo and vhost.");
        if (ret.deployTo) ret.deployTo = ret.deployTo.replace(/\/$/, "");
        return ret;
    }
,   error:  function (msg) {
        this.log("[ERROR] " + msg);
        throw new Error(msg);
    }
,   readRelFile:    function (path) {
        return fs.readFileSync(pth.join(__dirname, path), "utf8");
    }
    // all content can be either a string path to a file, or a buffer
,   loadContent:    function (source) {
        if (_.isString(source)) return fs.readFileSync(source);
        else return source;
    }

## Internal API

These methods are also exposed, but they probably aren't useful unless you're hacking
on Couth itself.

### `log`

Logs a message to stdout, respecting the silent flag if present.

### `app.target([target])`

Get or set the target used for this run. The known targets are `dev`, `prod`, and `test`.

### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``
### ``


## Continuous Execution

During development it can be convenient for your couth application to be re-run
whenever there's a change so that you don't have to constantly return to the
command line while you're tweaking some small detail, and can instead just
hit reload.

Nothing simpler, first, if that's not already the case, just install `nodemon`:

    npm install -g nodemon

And then run it:

    nodemon --watch static -e js,css,html app.js 

The above will only watch inside the static directory but will take into account
file extensions js, css, and html (the default being just js). You can drop the
`--watch` to watch everything or you can specify several, and you can add more
file extensions.
