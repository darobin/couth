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
