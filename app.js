var express = require('express')
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3')
var session = require('express-session')

var db = new sqlite3.Database("./db/movie-friends.db")
var app = express()

// This middleware enables us to use request.body to read data from forms with
// method="POST".
app.use(bodyParser.urlencoded({extended: false}))
app.set('view engine', 'hbs')

var db = new sqlite3.Database("./db/movie-friends.db")


///// CHUNK CODE SESSION

app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: "my-salt"
}))


app.use(function(request, response, next) {
    response.locals.session = request.session.user
    next()
})

///////////////

app.get("/", function(request, response){
    // push un truc de la db ici
      db.all("select * from movie", function(err, rows){

	   response.render('movies', {rows: rows})
      })
	
})

app.get("/movies/:id", function(request, response){
	var id = parseInt(request.params.id)
//	var rating = []
    
    db.all("select * from movie where movie.id = ?", id, function(err, movieRows){     
        db.all("select rating from rating where rating.movie_id = ?", id, function(err, rows){
            console.log(movieRows)
            response.render('movie', {movie: movieRows[0], rows: rows})
        })
    })
})

app.get("/create-movie", function(request, response){
	response.render('create-movie', {})
})

app.post("/create-movie", function(request, response){
    
    // redo en propre avec un query pour trouve les truc submit et do the same pour le user 
    db.all("select * from movie where lower(movie.title) = ? and lower(movie.year) = ?", request.body.title.toLowerCase(), request.body.year.toLowerCase(), function(err, rows){
        
        if (rows.length == 0) {
             db.all("select * from movie", function(err, rows2){
                 newMovie = {
                     id: rows2.length,
                     year: parseInt(request.body.year),
                     title: request.body.title
                 }
                db.run("INSERT INTO movie(id,year,title) VALUES (?,?,?)", newMovie.id, newMovie.year, newMovie.title)
                db.run("INSERT INTO rating(movie_id, rating) VALUES (?,?)", newMovie.movie_id, request.body.rating)
                
                response.redirect("/movies/"+newMovie.id)
 
             })
        }
        else {
            console.log(rows)
            db.run("INSERT INTO rating(movie_id, rating) VALUES (?,?)", rows[0].id, request.body.rating)

            response.redirect("/movies/"+rows[0].id)
        }
            
    })
	
})

app.get("/create-user", function(request, response){
	response.render('create-user', {})
})

app.post("/create-user", function(request, response){
    db.all("select * from users where users.username = ?", request.body.username, function(err, rows){
        
        if (rows.length == 0) {
            db.all("select * from users", function(err, rows2){
                db.run("INSERT INTO users VALUES (?, ?,?)", rows2.length, request.body.username, request.body.password)
                var newUser = {id: request.body.username, password: request.body.password }
                request.session.user = newUser
                response.redirect('/')
            })
        }
        
        else {
            response.render('create-user.hbs', {error: "User already exists."})
        }    
    })
	
})

app.get("/log-user", function(request, response){
	response.render('log-user', {})
})

app.post("/log-user", function(request, response){
    db.all("select * from users where users.username = ? and users.password = ?", request.body.username, request.body.password, function(err, rows){        
        if (rows.length == 0) {
            response.render("/log-user", {error: "Username or password is wrong"})
        }
        else {
            var newUser = {id: request.body.username, password: request.body.password }
            request.session.user = newUser
            reponse.redirect("/")
        }   
    })
})

app.post("/logout", function(request, response){
    request.session = null
})

app.listen(8000)
