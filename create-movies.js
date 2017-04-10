var sqlite3 = require('sqlite3')

// DATA - DELETE AFTER - THIS IS FOR PROJECT DEBUG PURPOSE
var movies = [
    {id: 0, year: 2001, title: "Shrek"},
    {id: 1, year: 1995, title: "Dumb & Dumber"},
    {id: 2, year: 1994, title: "The Lion King"}
]
// ADD BY_USER_ID TO DB WHEN USER SESSION IS DONE
var ratings = [
    {movie_id: 0, rating: 5, by_user_id: 1},
    {movie_id: 0, rating: 4, by_user_id: 1},
    {movie_id: 1, rating: 3, by_user_id: 1},
    {movie_id: 2, rating: 0, by_user_id: 1}
]

var users = [
    {user_id: 0, username: "admin", password: "admin"},
    {user_id: 1, username: "yanice", password: "yanice"}
]

///////////////////////////// DELETE BEFORE THIS /////////////////////

// CODE EXAMPLE
// db.run(QUERY)

// CREATE DB
// name, flags, callback
// default flags are OPEN_READWRITE | OPEN_CREATE
var db = new sqlite3.Database("./db/movie-friends.db")


if (db)
    console.log("db creation success")
else //!db
    console.log("db creation failed")

    // DB creation and filling is value doesn't exist (TO BE DONE)
db.serialize(function(){
    db.run("CREATE TABLE if not exists movie(id INT UNIQUE PRIMARY KEY, year INT, title TEXT)", function(err){
        if (err)
            console.log(err.message)
        else {
                var fill = db.prepare("INSERT INTO movie VALUES (?,?,?)")
                
                for (i=0; i < movies.length ; i++) {
                    if (movies[i].id != null && movies[i].year!= null && movies[i].title != null)
                        fill.run(movies[i].id, movies[i].year, movies[i].title)
                        }    
                fill.finalize()
            }
    })
    
    db.run("CREATE TABLE if not exists rating (movie_id INT, rating INT)", function(err) {
        if (err)
            console.log(err.message)
        else {
                var fillRating = db.prepare("INSERT INTO rating VALUES (?,?)")
                // RAJOUTE VALUE USER_ID AFTER USER SESSION IS DONE
                for (i=0; i < ratings.length ; i++) {
                    if (ratings[i].movie_id != null, ratings[i].rating != null, ratings[i].by_user_id != null)
                        fillRating.run(ratings[i].movie_id, ratings[i].rating)
                }
            fillRating.finalize()    
        }        
    })
    
       db.run("CREATE TABLE if not exists users (user_id INT UNIQUE PRIMARY KEY, username TEXT UNIQUE, password TEXT)", function(err) {
        if (err)
            console.log(err.message)
        else {
                var fillUser = db.prepare("INSERT INTO users VALUES (?,?,?)")
                
                for (i=0; i < users.length ; i++) {
                    if (users[i].user_id != null, users[i].username != null, users[i].password != null)
                        fillUser.run(users[i].user_id, users[i].username, users[i].password)
                }
            fillUser.finalize()    
        }        
    })
})  