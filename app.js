var express = require('express')
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3')
var session = require('express-session')
var hash = require('password-hash')

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
      db.all("select * from movie", function(err, rows){
	   response.render('movies', {rows: rows})
      })
	
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////// MOVIES ////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/movies/:id", function(request, response){
	var id = parseInt(request.params.id)
    
    db.all("select * from movie where movie.id = ?", id, function(err, movieRows){     
        db.all("select rating from rating where rating.movie_id = ?", id, function(err, rows){
            response.render('movie', {movie: movieRows[0], rows: rows})
        })
    })
})

app.post("/movies/:id", function(request, response){
	var id = parseInt(request.params.id)
    
        db.run("DELETE FROM rating WHERE rating.movie_id=? AND rating.user_id=?", id, request.session.user.id)
        db.all("select * from rating where rating.movie_id=?", id, function(err,rows){
            if (rows.length == 0) {
                db.run("DELETE from movie where id=?", id)
                response.redirect("/my_page")
            }
        })
})

// DELETE BY ADMIN

app.post("/delete_rating", function(request, response){
	var userId = request.body.userid
    var movieId = request.body.movieid
        console.log(movieId)
        db.run("DELETE FROM rating WHERE rating.movie_id=? AND rating.user_id=?", movieId, userId)
        db.all("select * from rating where rating.movie_id=?", movieId, function(err,rows){
            if (rows.length == 0) {
                db.run("DELETE from movie where id=?", movieId)
                response.redirect("/")
            }
            response.render('admin.hbs', {error: "Rating deleted!"})
        })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// CREATE MOVIES ////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/create-movie", function(request, response){
	response.render('create-movie', {})
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
    db.all("select * from users", function(err, rows){
        response.render("users.hbs", { rows: rows })
    })
})

app.get("/user/:id", function(request, response){
    
    var id = parseInt(request.params.id)
    db.all("select * from users where user_id=?", id, function(err, user){
        console.log(user[0])
        db.all("select * from rating where user_id=?", id, function(err, rating){
            console.log(rating)
            response.render("user.hbs", { user: user[0] , rating: rating})
        })
    })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// MY PAGE //////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/my_page", function(request, response){
    db.all("SELECT movie.title, movie.id, rating.rating, users.user_id from movie, rating, users WHERE movie.id = rating.movie_id AND users.user_id = rating.user_id AND users.username = ?", request.session.user.username, function(err, rows){
        response.render("my_page.hbs", {user: rows})        
    })
})

app.get("/admin", function(request, response){
  
        if (request.session.user.role != "admin")
            response.status(403).send("ERROR 403: Unauthorized Acces! You can't come here buddy :(")   
        
        db.all("SELECT movie.title, movie.id, rating.rating, rating.user_id, users.user_id from movie, rating, users WHERE movie.id = rating.movie_id AND users.user_id = rating.user_id", function(err, rows){
            response.render("admin.hbs", {user: rows})
        })
})

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////// LOG USERS OUT ////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/logout", function(request, response){
    request.session.destroy(function(){})
    response.redirect('/')
})

app.listen(8000)
