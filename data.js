var sqlite3 = require('sqlite3')
var secu = require('./administration.js')
var N3 = require('n3')
var js2xmlparser = require("js2xmlparser")


var db = new sqlite3.Database("./db/movie-friends.db")

///////// SPARQL ////////

var fetch = require('isomorphic-fetch')
var SparlqHttp = require('sparql-http-client')
SparlqHttp.fetch = fetch

var endpoint = new SparlqHttp({endpointUrl: "http://dbpedia.org/sparql"})

var pry = require('pryjs')

    //////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////// GET ALL MOVIES ////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
exports.getAllMovies = function (callback) {
    db.all("SELECT * FROM movie", function (err, movies) {
        callback(movies)
    })
}
    //////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////// CREATE MOVIES /////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////

exports.doesMovieExist = function (title, year, callback) {
    db.all("SELECT * FROM movie where LOWER(title)=? AND year=?", title.toLowerCase(), year, function (err, movieRows) {
        if (err)
            console.log(err)
        else {
            if (movieRows.length == 0) callback(false, [])
            else callback(true, movieRows[0])
        }
    })
}

exports.createMovie = function (newMovie, callback) {
    getSparql(newMovie.title, function(result){
        db.all("SELECT * FROM movie", function (err, movies) {
            newMovie.id = movies.length
            if (result.results.bindings.length != 0) {
                db.run("INSERT INTO movie VALUES (?,?,?,?,?,?,?)", newMovie.id, newMovie.year, newMovie.title, parseInt(result.results.bindings[0].runtime.value), result.results.bindings[0].director.value, result.results.bindings[0].actors.value, result.results.bindings[0].abstract.value)
                callback(newMovie.id)
            }
            else {
                db.run("INSERT INTO movie VALUES (?,?,?,?,?,?,?)", newMovie.id, newMovie.year, newMovie.title, 0, "", "", "")
                callback(newMovie.id)                
            }
        })
    })
}

function getSparql(title,callback){
    var query = 'PREFIX dbo: <http://dbpedia.org/ontology/> SELECT ?runtime ?movie ?abstract  (group_concat (DISTINCT ?directName;separator=", ") as ?director) (group_concat(DISTINCT ?actors;separator=", ") as ?actors) WHERE { ?movie rdf:type dbo:Film . ?movie rdfs:label "' + title + '"@en . ?movie dbo:runtime ?runtime . ?movie dbo:abstract ?abstract . ?movie dbo:director ?director . ?director dbo:birthName ?directName . ?movie dbo:starring ?actorlist . ?actorlist dbo:birthName ?actors . FILTER (lang(?abstract) = "en") } GROUP BY  ?abstract ?runtime ?movie'
    
    endpoint.selectQuery(query).then(function(response){
        return (response.text())
    }).then(function(result){
        callback(JSON.parse(result))
    }).catch(function(err){
        console.log(err)
    })
}

exports.createRating = function (user_id, movie_id, rating) {
        db.run("INSERT INTO rating VALUES (?,?,?)", movie_id, rating, user_id)
}

//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////// GET MOVIE BY ID + ITS RATINGS ///////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.getMovieById = function (id, callback) {
        db.all("SELECT * FROM movie WHERE id = ?", id, function (err, movie) {
            db.all("select rating from rating where rating.movie_id = ?", id, function (err, rating) {
                callback(movie, rating)
        })
    })
}
    //////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// GET MOVIES RATED BY USERS /////////////////////////////////////////
    /////////////////////////////// ///////////////////////////////////////////////////////////////////
exports.getMovieUser = function (username, callback) {
    db.all("SELECT movie.title, movie.id, rating.rating, users.user_id from movie, rating, users WHERE movie.id = rating.movie_id AND users.user_id = rating.user_id AND users.username = ?", username, function (err, rows) {
        callback(rows)
    })
}

exports.getMovieAdmin = function (callback) {
        db.all("SELECT movie.title, movie.id, rating.rating, rating.user_id, users.user_id from movie, rating, users WHERE movie.id = rating.movie_id AND users.user_id = rating.user_id", function (err, rows) {
            callback(rows)
        })
}
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////// DELETE RATING AND MOVIE /////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
exports.deleteRatingByUser = function (id, userId) {
    db.run("DELETE FROM rating WHERE rating.movie_id=? AND rating.user_id=?", id, userId)
}

exports.deleteMovieIfEmpty = function (id) {
        db.all("select * from rating where rating.movie_id=?", id, function (err, rows) {
            if (rows.length == 0)
                db.run("DELETE from movie where id=?", id)
        })
}

exports.deleteMovieByAdmin = function (userId, movieId) {
        db.run("DELETE FROM rating WHERE rating.movie_id=? AND rating.user_id=?", movieId, userId)
}

//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// CREATE MOVIE ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// GET USERS //////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.getAllUsers = function (callback) {
    db.all("select * from users", function (err, rows) {
        callback(rows)
    })
}

exports.getUserById = function (id, callback) {
    db.all("select * from users where user_id=?", id, function (err, user) {
        db.all("select * from rating where user_id=?", id, function (err, rating) {
            callback(user, rating)
        })
    })
}

exports.alreadyFriend = function(idLogged, idToBeFriend, callback) {
    db.all("SELECT * from friends where friends.userId=? and friends.friendId=?", idLogged, idToBeFriend, function(err, rows){
        callback(rows)
    })
}

exports.addFriend= function(friendId, id) {
    db.run("INSERT INTO friends VALUES (?,?)", id, friendId)
}

exports.getFriendById = function(id, callback) {
    db.all("SELECT users.username as username, users.user_id FROM friends INNER JOIN users ON friends.friendId = users.user_id WHERE friends.userId =?", id, function(err, rows){
        db.all("SELECT users.username as username, users.user_id FROM friends INNER JOIN users ON friends.userId = users.user_id WHERE friends.friendId =?", id, function(err, rows2){
            callback(rows, rows2)
        })
    })
}


//////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////// USERS CREATION & LOG ///////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

exports.doesUserExist = function (username, callback) {
    db.all("SELECT * from users where users.username=?", username, function (err, rows) {
        if (rows.length == 0)
            callback(false)
        else
            callback(true)
    })
}
exports.createUser = function (username, password, callback) {
    var pass = secu.hashPassword(password)
    db.all("select * from users", function (err, rows) {
        var newId = rows.length
        db.run("INSERT INTO users VALUES (?,?,?,?,?,?)", newId, username, pass, "", "", "")
        db.run("INSERT INTO roleMembers VALUES (?, ?)", newId, 1)
        db.run("INSERT INTO roleMembers VALUES (?, ?)", newId, 2)
        callback(newId, username, pass)
    })
}

exports.updateUser = function(id, name, lastName, gender, callback) {
    db.all("SELECT * FROM users WHERE users.user_id=?", id, function(err, rows){
        if (err)
            console.log(err.message)
        else {
            db.run("UPDATE users SET name=?, lastName=?, gender=? WHERE user_id=?", name, lastName, gender, id)
            callback(rows[0])
        }
    })
}

exports.deleteUser = function(id, callback) {
    db.run("DELETE FROM users WHERE user_id=?", id)
}

exports.deleteFriend = function(id) {
    db.run("DELETE FROM friends WHERE userId=?", id)
}

exports.logUser = function (username, password, callback, token) {
    db.all("SELECT * FROM users WHERE users.username=?", username, function (err, userRows) {
        if (err)
            console.log(err)
        else {
            var dbPassword = userRows[0].password
            var userId = userRows[0].user_id
            if (secu.verifyPassword(password, dbPassword) == true) {
                secu.createAPIToken(username, dbPassword, userId, function (token) {
                    getRoleById(userRows[0].user_id, function (isAdminFlag) {
                        if (isAdminFlag == 0)
                            callback(null, "admin", userRows[0], token)
                        else
                            callback(null, "limited", userRows[0], token)
                    })
                })
            }
            else
                callback("Password is invalid", "", null, null)
        }
    })
}

exports.getFoaf = function(user, callback){
    db.all("SELECT friendId FROM friends WHERE userId=?", user.user_id, function(err, rows){
        var writer = N3.Writer({prefixes: {foaf: 'http://xmlns.com/foaf/0.1/'}})
        
        if (user.name != "" && user.lastName != "") {
            writer.addTriple({
                subject: 'http://localhost:8000/user/'+user.user_id,
                predicate: 'foaf:name',
                object: user.name + " " + user.lastName
            })
        }
        else {
            writer.addTriple({
                subject: 'http://localhost:8000/user/'+user.user_id,
                predicate: 'foaf:name',
                object: user.username
            })        
        }

        for (var i = 0; i < rows.length ; i++){
            var predicate = 'http://localhost:8000/user/' + rows[i].friendId
            var subject = 'http://localhost:8000/user/' + user.user_id
            console.log(predicate)
            console.log(subject)
            writer.addTriple(subject, 'foaf:knows', predicate)
        }

        writer.end(function(error, profile){
            callback(profile)
        })
    })
}

/// API ///

exports.createXMLArray = function(arrayObject, name, callback){
    var XMLToReturn = null
    for (var i=0; i < arrayObject.length; i++){
        XMLToReturn += js2xmlparser.parse(name, arrayObject[i])
    }
    callback(XMLToReturn)
}

exports.createXMLObject = function(Object, name, callback){
    var XMLToReturn = null  
    XMLToReturn = js2xmlparser.parse(name, Object)
    callback(XMLToReturn)
}


function getRoleById(id, callback) {
    db.all("SELECT role_id FROM roleMembers WHERE memberId=?", id, function (err, rows) {
        if (err)
            console.log(err)
        else {
            if (rows[0].role_id == 0) callback(0)
            else callback(1)
        }
    })
}
