
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

    var couth = require("..")
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

## Internal API

These methods are also exposed, but they probably aren't useful unless you're hacking
on Couth itself.


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
