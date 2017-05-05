var sqlite3 = require('sqlite3')
var secu = require('./administration.js')

var db = new sqlite3.Database("./db/movie-friends.db")

//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// GET ALL MOVIES ////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////


exports.getAllMovies = function (callback) {
  db.all("SELECT * FROM movie", function (err, movies) {
      callback(movies)
    })
}


//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// CREATE MOVIES ////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.doesMovieExist = function(title, year, callback) {
    db.all("SELECT * FROM movie where LOWER(title)=? AND year=?", title.toLowerCase(), year, function(err, movieRows){
        if (err)
            console.log(err)
        else {
            if (movieRows.length == 0)
                callback(false, [])
            else
                callback(true, movieRows[0])
        }
    })
}

exports.createMovie = function(newMovie, callback) {
    db.all("SELECT * FROM movie", function (err, movies) {
        console.log(movies.length)
        newMovie.id = movies.length
        db.run("INSERT INTO movie VALUES (?,?,?)", newMovie.id, newMovie.year, newMovie.title)
        callback(newMovie.id)
    })    
}

exports.createRating = function(user_id, movie_id, rating) {
    db.run("INSERT INTO rating VALUES (?,?,?)", movie_id, rating, user_id)
}

//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// GET MOVIE BY ID + ITS RATINGS ///////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.getMovieById = function (id, callback) {
  db.all("SELECT * FROM movie WHERE id = ?", id, function (err, movie) {
      db.all("select rating from rating where rating.movie_id = ?", id, function(err, rating){
            callback(movie, rating)
        })
    }
  )
}

//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////// GET MOVIES RATED BY USERS /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.getMovieUser = function(username, callback) {
    db.all("SELECT movie.title, movie.id, rating.rating, users.user_id from movie, rating, users WHERE movie.id = rating.movie_id AND users.user_id = rating.user_id AND users.username = ?", username, function(err, rows){
        callback(rows)        
    })
}

exports.getMovieAdmin = function (callback) {
    
    db.all("SELECT movie.title, movie.id, rating.rating, rating.user_id, users.user_id from movie, rating, users WHERE movie.id = rating.movie_id AND users.user_id = rating.user_id",
           function(err, rows) {
            callback(rows)
    })

}

//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// DELETE RATING AND MOVIE /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.deleteRatingByUser = function(id, userId) {
    db.run("DELETE FROM rating WHERE rating.movie_id=? AND rating.user_id=?", id, userId)
}

exports.deleteMovieIfEmpty = function(id, callback) {
    db.all("select * from rating where rating.movie_id=?", id, function(err,rows){
        if (rows.length == 0)
            db.run("DELETE from movie where id=?", id)
    })           
}

exports.deleteMovieByAdmin = function(userId, movieId) {
    db.run("DELETE FROM rating WHERE rating.movie_id=? AND rating.user_id=?", movieId, userId)
}

//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// CREATE MOVIE ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// GET USERS ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.getAllUsers = function(callback) {
    db.all("select * from users", function(err, rows){
        callback(rows)
    })
}

exports.getUserById = function(id, callback) {
    db.all("select * from users where user_id=?", id, function(err, user){
        db.all("select * from rating where user_id=?", id, function(err, rating){
            callback(user, rating)
        })    
    })
}


//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// USERS CREATION & LOG
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.doesUserExist = function(username, callback) {
    db.all("SELECT * from users where users.username=?", username, function(err, rows){
        console.log(rows.length)
        if (rows.length == 0)
            callback(false)
        else
            callback(true)
    })
}

exports.createUser = function(username, password, callback) {
    var pass = secu.hashPassword(password)
    
    db.all("select * from users", function(err, rows) {
        var newId = rows.length
        db.run("INSERT INTO users VALUES (?,?,?)", newId, username, pass)
        db.run("INSERT INTO roleMembers VALUES (?, ?)", newId, 1)
        db.run("INSERT INTO roleMembers VALUES (?, ?)", newId, 2)
        callback(newId, username, pass)
    })
}

exports.logUser = function(username, password, callback) {
    db.all("SELECT * FROM users WHERE users.username=?", username, function(err, userRows){
        if(err)
            console.log(err)
        else {
            var dbPassword = userRows[0].password
            if (secu.verifyPassword(password ,dbPassword) == true) {
                    
                getRoleById(userRows[0].user_id, function(isAdminFlag){
                    if (isAdminFlag == 0) 
                        callback(null, "admin", userRows[0])
                    else
                        callback(null, "limited", userRows[0])
                })
            }
            else
                callback("Password is invalid", "", null)
        }
        
    })
}

function getRoleById(id, callback){
    db.all("SELECT role_id FROM roleMembers WHERE memberId=?", id, function(err, rows){
        if (err)
            console.log(err)
        else {
            if (rows[0].role_id == 0)
                callback(0)
            else 
                callback(1)
        }      
    })
}

