
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
* Generate a form to create and edit the relevant objects, including nice things such
  as direct validation or drag and drop reodering of array items.
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

### `app.addStaticDir(dir, [opts])`

Recursively adds the content of a directory as static resources in the app. It will guess
the proper media type for each file.

The `opts` object can contain one option: `keepDotFiles` which defaults to `false`. If set to
`true` this will also attach files that begin with a dot instead of skipping them.

### `app.addStatics(statics)`

Takes an array of static resources to add to the app (this is what does the underlying work
for `addStaticDir()`). Each item in the array is a specifier that has the following fields:

* `path`: the path it will have in the app.
* `content`: a string pointing to a file, or a Buffer, with the resource's content.
* `type`: (optional) the media type for this item.

If a specifier is passed directly instead of an array, this will DWIM.

### `app.cli()`

If you want your app to process command line arguments in a convenient default way, simply
call this. The recognised options are:

* `--target TARGER`, `-t TARGET`. Set the target environment.
* `--debug`, `-d`. Turn debugging mode on (prepares everything but does a fake deploy).
* `--silent`, `-s`. Turn silent mode on (there will be no output).
* `-dev`. Shortcut for `--target dev`.
* `-prod`. Shortcut for `--target prod`.

### `app.deploy(cb)`

Actually runs the deployment. You should call that once your app object is fully configured.
The callback will received an error if there was a problem, null otherwise.

### `app.addRewrite(from, to, method, query)`

Adds a new rewrite. Both `from` and `to` are required paths that are getting rewritten.
If specified, `method` limits the rewrite to a specific method. If present, `query` is
an object that provides key/value parameters to be added to the rewritten query (typically
CouchDB view parameters such as `include_docs` or `skip`). Note that you do not need this
CouchDB madness of escaping booleans and numbers, Couth does it for you.

### `app.addLib(libName, content)`

Adds a library of code that views, lists, shows, etc. can load using CommonJS and run.
`libName` is the name of the library (it will be available under `lib/` so if you give it a name
of "foo" code can then load it with `require("lib/foo")`). `content` is a string pointing to a
file to load, or a Buffer.

### `app.type(name)`

Creates a new `Type` object for the given name and returns it. See below for the Type API.

## Type API

### `type.schema(webSchema)`

Simply accepts a [Web Schema](https://github.com/darobin/web-schema). Note however that the
current implementation of the forms generator does not support absolutely all variants (it
supports a lot of them though) so don't go *too* wild. Also, you want to use the `description`
field almost systematically since that's what produces the form label.

### `type.permissions(perms)`

Sets the permissions on this type. The default is full access to all. The keys of the `perms`
object can be `create`, `update`, or `delete` (`read` will be supported before v1.0). The values
can be any of `*` for access to anyone, `logged` to required a logged in user, or `admin` for
a DB admin. The capabilities for these checks will grow.

### `type.deploy(couth, ddoc)`

This is the method that Couth call on the type object when it needs to deploy it. There should
be no reason for you to call this directly.

## Client-side Resources

Couth provides a number of client side resources that can prove to be very useful. The example
app makes use of all of them.

### `/couth/js/all.js`

This contains AngularJS, jQuery, the small parts of jQuery UI needed for drag and drop reordering,
the code to generate JS APIs to the backend and a host of useful code if you're using Angular.
The latter part includes:

* The `couth-type` directive that a form uses to register itself as an editor for a type.
* The `couth-dnd` directive that is used to support drag and drop reordering of items in a model.
* The `CouthCtrl` controller that your application would likely use. This handles setting up the
  session so that you know who the user is (if logged in), handling all the login/logout/signup
  functionality. It also handles the loading events (to show the loader), error and success
  messages, and how to dispatch to the form that supports a given type when it needs to be edited
  or created.
* The `CouthFormCtrl` controller that is used on the form. This handles saving, resetting, 
  and reordering arrays.
* The `startFrom` filter that makes it possible to do pagination of the content.
* The `CouthSimpleCRUD` service which makes it easier to set everything up to support full client-side
  CRUD with a single method call (see the example app's client side JS).

### `/couth/forms/$typeName.html`

The form that knows how to edit a given type. You can include this with `ng-include`.

### `/couth/types/$typeName.json`

A representation of all the types. This can be used to discover information about the types.

### `/couth/user.html`

An includable piece of HTML that can contains all that's needed to have a UI for login, logout,
and signup.

### `/couth/load-indicator.html` and `/couth/img/loader.gif`

An includable piece of HTML to show the load indicator image when a request is going on.

### `/couth/messages.html`

Success/error messages that respond to success and error events in the page.

### `/couth/css/couth-core.css`

A few CSS rules that complement what Bootstrap already provides. Recommended if you use the HTML
includes.

### `/couth/pagination.html`

An includable piece of HTML that you can use to paginate a set of results. See the example app
for how it's used (the most important part is to set it up with `CouthSimpleCRUD`).

### `/couth/edit-item.html` and `/couth/confirm-delete-item.html`

Includable pieces of HTML that you can use to trigger the edition of an objection or its deletion
(with built in confirmation). See the example app for usage, the important thing being to
properly assign `$couthItem`.


## Internal API

These methods are also exposed, but they probably aren't useful unless you're hacking
on Couth itself.

### `app.log(string)`

Logs a message to stdout, respecting the silent flag if present.

### `app.target([target])`

Get or set the target used for this run. The known targets are `dev`, `prod`, and `test`.

### `app.resolve([target])`

Returns the configuration that applies for a given target (the configured one if not
provided) after it has been properly merged and defaulted.

### `app.error(string)`

Logs a message to the console and throws an error.

### `app.readRelFile(path)`

Reads a file as UTF-8, relative to the Couth library.

### `app.loadContent(source)`

Almost anything in Couth that loads content can accept either a string or a Buffer. If
given a string, this will return a Buffer; if given a Buffer it just returns it.

### `app.couthUserRoutes()`

Sets up the rewrites needed to expose the Couth user API (basically nice URLs on top of
CouchDB's user system).

### `app.addAttachment(path, content, mediaType)`

Does the grunt work of uploading an attachment. You probably want to call the higher level
methods that deal with static content as this really will only do the upload. It takes the path
at which you want the attachment stored on the design document, the content (path to file or Buffer),
and an optional media type.

### `app.addRequest(request)`

Internally, when we process the various commands, everything that needs to make a request
calls this, and it is only when deploy is called that the requests are actually executed
(guaranteed one by one, in order).

The `request` that is passed is an object with two fields:

* `run`: this is a function that will receive a Cradle instance, and a callback to call once
  it's done processing.
* `reason`: a string indicating what's going on with this request.

### `app.vhostInfo()`

Produces information about the vhosts that will be needed.

### `app.enforceConfig()`

Builds requests that will configure CouchDB with the right session timeout and disable
secure rewrites (don't panic about this).

### `app.prepareVHost()`

Builds the requests that will configure the vhosts in CouchDB.

### `app.fakeDeploy(cb)`

Runs a fake deployment (will output all requests but not touch the server). Calls the
callback with an error if any.

### `app.realDeploy(cb)`

Runs the real deployment. Calls the callback with an error if any.

### `app.loadCurrentDesign(cb)`

Gets the current design document (it is guaranteed to return one even when there is none).
The callback gets called with an error which is `null` on success and the design document.

### `app.couthResources()`

Adds all sorts of useful resources such as script dependencies, forms, etc.

### `app.prepareValidation()`

Prepares everything that's needed to perform validation and permissions checking.

## Misc internals

### Forms support

In `couth/forms` is a module with a `generate()` method that can take a Type and generate an
Angular-friendly form that can create or edit it. This is mostly used internally, but if you're
seeing form problems or limitations that's the place to look.

### Design utils

In `couth/couch/design-utils.js` is a library that gets added to the libs on the design document.
The methods it provides are helpful to write basic views, show and list functions, and update
functions.

## Testing Couth Apps

XXX document couth/tester
