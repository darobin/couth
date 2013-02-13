

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
