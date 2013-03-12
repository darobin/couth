
## How to get this running

To get this example running, you will need to have Couth installed and CouchDB running.

You will also need to have the two hostnames configured `books.dev` and
`deploy.books.dev` to point to where your CouchDB instance is running. They can be anything
else but you will need to change the example to match.

You will need to set the username and password to something real. If your CouchDB is running
in Admin Party mode, then you can just delete that line.

Then you run:

    node app.js

This ought to deploy to Couch. You should then be able to get to: http://books.dev:5984/ and
see the site.

Obviously in a real-world setting you would likely use an HTTP proxy on port 80 in front of 
CouchDB. For nginx the set up would be:


    upstream couch {
        server 127.0.0.1:5984;
    }

    server {
        listen          80;
        server_name     deploy.books.dev books.dev;

        location / {
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header Host $http_host;
            proxy_set_header X-NginX-Proxy true;

            proxy_pass http://couch/;
            proxy_redirect off;
        }
    }


If you do want to hack on this, you probably want to read the documentation section
on "Continuous Execution" as it will make your life much nicer.
