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
    
    var inputTitle = request.body.title
    var inputYear = request.body.year
    var inputRating = request.body.rating
    
    var newMovie = {id: 0, title: inputTitle, year: inputYear}
    
    ddb.doesMovieExist(inputTitle, inputYear, function(returnValue, row){
        if (returnValue == false) {
            ddb.createMovie(newMovie, function(movie_id){
                console.log("in app.js " + movie_id)
                newMovie.id = movie_id
                ddb.createRating(request.session.user.id, movie_id, inputRating)
                response.redirect("/movies/"+movie_id)
            })
        }
        else {
            console.log(row.movie_id)
            newMovie.id = row.movie_id
            ddb.createRating(request.session.user.id ,row.movie_id, inputRating)
            response.redirect("/movies/"+row.movie_id)

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
    
    var inputUsername = request.body.username
    var inputPass = request.body.password
    
    ddb.doesUserExist(inputUsername, function(returnValue){
        if (returnValue == true)
            response.render('create-user.hbs', {error: "User already exists."})
        else {
            ddb.createUser(inputUsername, inputPass, function(newId, newUsername, newPass) {
                var newUser = {id: newId, username: newUsername, password: newPass, role: "limited" }
    
                request.session.user = newUser
                response.redirect('/')
            })
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
    var inputUser = request.body.username 
    var inputPass = request.body.password

    ddb.doesUserExist(inputUser, function(returnValue) {
        if (returnValue == true) {
            
            ddb.logUser(inputUser, inputPass, function(err, role, userRows){
                if (err)
                    response.render("log-user.hbs", {error: err})
                else {
                    var newUser = {id: userRows.user_id, username: userRows.username, password: userRows.password, role: role}
                    request.session.user = newUser
                    response.redirect("/")
                }
            })
        }
        else
            response.render("log-user.hbs", {error: "Username doesn't exist"})
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
