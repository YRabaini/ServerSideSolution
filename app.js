var express = require('express')
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3')
var session = require('express-session')
var hash = require('password-hash')
var ddb = require('./data.js')
var pw = require('./administration.js')

// DEBUG

/*
var pry = require('pryjs')
eval(pry.it)
*/

var db = new sqlite3.Database("./db/movie-friends.db")
var app = express()

// This middleware enables us to use request.body to read data from forms with
// method="POST".
app.use(bodyParser.urlencoded({extended: false}))
app.set('view engine', 'hbs')


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
    ddb.getAllMovies(function(movies){
        console.log(movies)
        response.status(200)
        response.render('movies', {rows: movies})
    })	
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////// MOVIES ////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/movies/:id", function(request, response){
	var id = parseInt(request.params.id)
    // New way to do it
    ddb.getMovieById(id, function(movie, rating) {
        response.status(200)
        response.render('movie', {movie: movie[0], rows: rating})
    })
})

app.post("/movies/:id", function(request, response){
	var id = parseInt(request.params.id)
    var userId = request.session.user.id
    ddb.deleteRatingByUser(id, userId)
    ddb.deleteMovieIfEmpty(id, function(){})
    response.status(200)
    response.redirect("/my_page")
})

// DELETE BY ADMIN

app.post("/delete_rating", function(request, response){
	var userId = request.body.userid
    var movieId = request.body.movieid
    console.log(movieId)
    ddb.deleteMovieByAdmin(userId, movieId)
    ddb.deleteMovieIfEmpty(movieId, function(){
        response.status(200)
        response.render('admin.hbs', {error: "Rating deleted!"})
    })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// CREATE MOVIES ////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/create-movie", function(request, response){
	response.render('create-movie', {})
    response.status(200)
})

app.post("/create-movie", function(request, response){
    
    db.all("select * from movie where lower(movie.title) = ? and movie.year = ?", request.body.title.toLowerCase(), request.body.year, function(err, rows){
        
        if (rows.length == 0) {
             db.all("select * from movie", function(err, rows2){
                 newMovie = {
                     id: rows2.length,
                     year: parseInt(request.body.year),
                     title: request.body.title
                 }
                db.run("INSERT INTO movie(id,year,title) VALUES (?,?,?)", newMovie.id, newMovie.year, newMovie.title)
                db.run("INSERT INTO rating(movie_id, rating, user_id) VALUES (?,?,?)", newMovie.id, parseInt(request.body.rating), request.session.user.id)
                
                response.redirect("/movies/"+newMovie.id)
 
             })
        }
        else {
            db.all("select user_id from rating where user_id = ?", request.session.user.id, function(err, rows3){
                if (rows3.length == 0) {
                    console.log(rows[0].id)
                    console.log(request.session.user.id)
                    db.run("INSERT INTO rating(movie_id, rating, user_id) VALUES (?,?,?)", rows[0].id, parseInt(request.body.rating), request.session.user.id)
                    response.redirect("/movies/"+rows[0].id)
                }
                else
                    response.render('movies.hbs', {error: "You already rated this movie"})
            })
        }
            
    })
	
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// CREATE USERS /////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/create-user", function(request, response){
    response.status(200)
	response.render('create-user', {})
})

app.post("/create-user", function(request, response){
    db.all("select * from users where users.username = ?", request.body.username, function(err, rows){
        
        if (rows.length == 0) {
            var hashPass = hash.generate(request.body.password)
            console.log(hashPass)
            db.all("select * from users", function(err, rows2){
                db.run("INSERT INTO users VALUES (?, ?, ?)", rows2.length, request.body.username, hashPass)
                var newUser = {id: rows2.length, username: request.body.username, password: hashPass, role: "limited" }
                // GIVE READER AND WRITERS ROLES
                db.run("INSERT INTO roleMembers VALUES (?, ?)", newUser.id, 1)
                db.run("INSERT INTO roleMembers VALUES (?, ?)", newUser.id, 2)
                request.session.user = newUser
                response.redirect('/')
            })
        } 
        else {
            response.render('create-user.hbs', {error: "User already exists."})
        }    
    })
	
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// LOGIN USERS //////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/log-user", function(request, response){
	response.render('log-user', {})
})

app.post("/log-user", function(request, response){
    db.all("select * from users where username = ?", request.body.username, function(err, rows){
        if (hash.verify(request.body.password, rows[0].password)) {     
                // Account is good, nowcheck for rights
                db.get("SELECT role_id from roleMembers where memberId=?", rows[0].user_id, function(err, rows2){
                    if (rows2.role_id == 0)
                        var newUser = {id: rows[0].user_id, username: request.body.username, password: rows[0].password, role: "admin" }
                    else
                        var newUser = {id: rows[0].user_id, username: request.body.username, password: rows[0].password, role: "limited" }
                    request.session.user = newUser
                    response.redirect("/")
                })
        }   
        else
            response.render("log-user.hbs", {error: "Username or password is wrong"}) 
    })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// USERS ////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/users", function(request, response){
    ddb.getAllUsers(function(rows) {
        response.render("users.hbs", { rows: rows })
    })
})

app.get("/user/:id", function(request, response){
    
    var id = parseInt(request.params.id)
    ddb.getUserById(id, function(user, rating) {
        response.status(200)
        response.render("user.hbs", { user: user[0] , rating: rating})
    })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// MY PAGE //////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/my_page", function(request, response){
    var username = request.session.user.username
    ddb.getMovieUser(username, function(rows){
        response.status(200)
        response.render("my_page.hbs", {user: rows})        
    })
})

app.get("/admin", function(request, response){
    var role = request.session.user.role
    if (pw.isAdmin(role) == false)
        response.status(401).send("ERROR 401: Unauthorized Access! You can't come here buddy :(")   
    else
        ddb.getMovieAdmin(function(rows){
            response.status(200)
            response.render("admin.hbs", {user: rows})
        })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// LOG USERS OUT ////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/logout", function(request, response){
    request.session.destroy(function(){
        response.status(200)
        response.redirect('/')
    })
    
})

app.listen(8000)
