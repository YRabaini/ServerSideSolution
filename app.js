var express = require('express')
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3')
var session = require('express-session')
var hash = require('password-hash')
var ddb = require('./data.js')
var pw = require('./administration.js')
var json = require('jsonwebtoken')

// DEBUG

/*
var pry = require('pryjs')
    eval(pry.it)
*/


var app = express()

// This middleware enables us to use request.body to read data from forms with
// method="POST".
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
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
    response.status(200)
    response.redirect('/movies')
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////// MOVIES ////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/movies", function(request, response){
    ddb.getAllMovies(function(movies){
        response.status(200)
        response.render('movies', {rows: movies})
    })	
})

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
    ddb.deleteMovieIfEmpty(id)
    response.status(204)
    response.redirect("/my_page")
})

// DELETE BY ADMIN

app.post("/delete_rating", function(request, response){
	var userId = request.body.userid
    var movieId = request.body.movieid
    ddb.deleteMovieByAdmin(userId, movieId)
    ddb.deleteMovieIfEmpty(movieId)
    response.status(204)
    response.render('admin.hbs', {error: "Rating deleted!"})
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
        if (inputTitle.length > 200)
            response.render("create-movie.hbs", {error: "Movie title is too long."})
        else if (returnValue == false) {
            ddb.createMovie(newMovie, function(movie_id){
                newMovie.id = movie_id
                ddb.createRating(request.session.user.id, movie_id, inputRating)
                response.status(201)
                response.redirect("/movies/"+movie_id)
            })
        }
        else {
            newMovie.id = row.movie_id
            ddb.createRating(request.session.user.id ,row.movie_id, inputRating)
            response.status(201)
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
    var passConfirm = request.body.passwordConfirm

    
    ddb.doesUserExist(inputUsername, function(returnValue){
        if (passConfirm != inputPass)
            response.render('create-user.hbs', {error: "Passwords don't match."})
        else if (returnValue == true)
            response.render('create-user.hbs', {error: "User already exists."})
        else {
            ddb.createUser(inputUsername, inputPass, function(newId, newUsername, newPass) {
                var newUser = {id: newId, username: newUsername, password: newPass, role: "limited" }
    
                request.session.user = newUser
                response.status(201)
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
                if (err) {
                    response.status(200)
                    response.render("log-user.hbs", {error: err})
                }
                else {
                    var newUser = {id: userRows.user_id, username: userRows.username, password: userRows.password, role: role}
                    request.session.user = newUser
                    response.status(200)
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
    
    var selfId = request.session.user.id
    var id = parseInt(request.params.id)
    ddb.getUserById(id, function(user, rating) {
        ddb.alreadyFriend(selfId, id, function(friend){
            if (id == selfId) {
                response.status(200)
                response.redirect('/my_page')
            }
            if (friend.length == 0) {
                    response.status(200)
                    response.render("user.hbs", { user: user[0] , rating: rating})            
            }
            else {
                response.status(200)
                response.render("user.hbs", { user: user[0] , rating: rating, alreadyFriend: true})            
            }
        })
        
    })
})

app.post("/user/:id", function(request, response){
    var friendId = parseInt(request.body.   id)
    var id = request.session.user.id
    
    ddb.addFriend(friendId, id)
    response.status(201)
    response.redirect('/my_friends')
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// MY PAGE //////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/my_movies", function(request, response){
    var username = request.session.user.username
    ddb.getMovieUser(username, function(rows){
        response.status(200)
        response.render("my_page.hbs", {user: rows})        
    })
})

app.get("/my_account", function(request, response){
    ddb.getUserById(request.session.user.id, function(user, rating){
        if (user[0].name == "" && user[0].lastName == "" && user[0].gender == "") {
            response.status(200)
            response.render("my_account.hbs")
        }
        else {
            console.log(user)
            response.status(200)
            response.render("my_account.hbs", {user: user[0]})
        }
    })
})

app.post("/my_account", function(request, response){
    var name = request.body.name
    var lastName = request.body.lastName
    var gender = request.body.gender
    
    ddb.updateUser(request.session.user.id, name, lastName, gender, function(user){
        response.status(200)
        response.render("my_account.hbs", {user: user[0]})
    })
})

app.get("/my_friends", function(request, response){
    ddb.getFriendById(request.session.user.id, function(friends, friendAdded){
            response.render("my_friends.hbs", {friend: friends, friendAdded: friendAdded})
    })
})

app.get("/my_page", function(request, response){
    response.status(200)
    response.render("user_account.hbs")        
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
//////////////////////////////////////////////////////////////////// FOAF /////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/get_foaf", function(request, response) {
  response.status(200)  
  response.render("my_foaf.hbs")  
})

app.post("/get_foaf", function(request, response){
    ddb.getUserById(request.session.user.id, function(user){
        ddb.getFoaf(user[0], function(foafProfile){
            response.status(201)
            response.render("my_foaf.hbs", {foaf: foafProfile})
        })
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

/////// API ///////

app.get("/api/movies", function(request, response) {
    ddb.getAllMovies(function(movies){
        response.status(200)
        response.json(movies)
    })
})

app.get("/api/movies/:id", function(request, response) {
    ddb.getMovieById(request.params.id, function(movie, rating){        

        if (movie.length == 0) {
            response.status(404)
            response.json(null)
        }
        else {
            var ratingArray=[]
            for (var i = 0; i < rating.length; i++)
                ratingArray.push(rating[i].rating)
    
                var final = {
                id: movie[0].id,
                year: movie[0].year,
                title: movie[0].title,
                ratings: ratingArray
            }
            response.status(200)
            response.json(final)
        }
    })
})

app.get("/api/login", function(request, response){
    
    response.status(200)
})

app.post("/api/tokens", function(request, response){
    var usernameInput = request.body.username
    var PassInput = request.body.password
    
    ddb.doesUserExist(usernameInput, function(doesExist){
        if (doesExist == true) {
            ddb.logUser(usernameInput, PassInput, function(err, role, user, tokenReturn){
                if (err) {
                    response.status(401)
                    response.json(null)                    
                }
                else {
                    var tokenJSON = {token: tokenReturn}
                    response.status(201)
                    response.json(tokenJSON)
                }
            })
        }
        else {
            response.status(401)
            response.json(null)
        }
    })
})

app.post("/api/ratings", function(request, response){
    
    var regex = /Token (.+)/
    var authorizationHead = request.get("Authorization")
    if (!authorizationHead) {
            response.status(401)
            response.json(null)        
    }
    var tokenRegex = authorizationHead.match(regex)
    var token = tokenRegex[1]
    pw.checkToken(token, function(err){
        if (err) {
            response.status(401)
            response.json(null)
        }
        else {
            ddb.doesMovieExist(request.body.title, request.body.year,function(BoolValue, movie){
                if (BoolValue == true) {
                    ddb.createRating(request.body.userId, movie.id, request.body.rating)
                    response.status(201)
                    response.json(null)
                }
                else {
                    var newMovie = {id: -1,
                                    year: request.body.year,
                                    title: request.body.title
                                   }
                    ddb.createMovie(newMovie, function(newId){
                        ddb.createRating(request.body.userId, movie.id, request.body.rating)
                        response.status(201)
                        response.json(null)
                    })
                }
            })
        }
    })
})

app.delete("/api/ratings", function(request, response){
    var regex = /Token (.+)/
    var authorizationHead = request.get("Authorization")
    if (!authorizationHead) {
            response.status(401)
            response.json(null)        
    }
    else {
        var tokenRegex = authorizationHead.match(regex)
        var token = tokenRegex[1]
        pw.checkToken(token, function(err){
            if (err) {
                response.status(401)
                response.json(null)
            }
            else {
                var movieId = request.query.movieId
                var userId = request.query.userId
                ddb.getMovieById(movieId, function(movie){
                    if (movie.length == 0) {
                        response.status(404)
                        response.json(null)
                    }
                    else {
                        ddb.getUserById(userId, function(user, rating){
                            if (user.length == 0) {
                                response.status(404)
                                response.json(null)
                            }
                            else {
                                ddb.deleteRatingByUser(movieId, userId) 
                                ddb.deleteMovieIfEmpty(movieId)
                                response.status(204)
                                response.json(null)
                                
                            }
                        })
                    }
                })
            }
        })
    }
})

app.listen(8000)
