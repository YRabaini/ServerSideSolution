var sqlite3 = require('sqlite3')
var hash = require('password-hash')

// DATA - DELETE AFTER - THIS IS FOR PROJECT DEBUG PURPOSE
var movies = [
    {id: 0, year: 2001, title: "Shrek"},
    {id: 1, year: 1995, title: "Dumb & Dumber"},
    {id: 2, year: 1994, title: "The Lion King"}
]
// ADD BY_USER_ID TO DB WHEN USER SESSION IS DONE
var ratings = [
    {movie_id: 0, rating: 5, user_id: 1},
    {movie_id: 1, rating: 3, user_id: 1},
    {movie_id: 2, rating: 0, user_id: 1}
]

var users = [
    {user_id: 0, username: "admin", password: hash.generate("admin")},
    {user_id: 1, username: "yanice", password: hash.generate("yanice")}
]

var roles = [
    {role_id:0, role: "admin"},
    {role_id:1, role: "write"},
    {role_id:2, role: "read"}
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
    db.run("CREATE TABLE if not exists movie(id INT UNIQUE PRIMARY KEY, year INT, title TEXT, runtime INTEGER, director TEXT, actors TEXT, abstract TEXT)", function(err){})
    
    db.run("CREATE TABLE if not exists friends(userId INT, friendId INT)", function(err){})
    
    db.run("CREATE TABLE if not exists rating (movie_id INT, rating INT, user_id INT)", function(err) {})
    
       db.run("CREATE TABLE if not exists users (user_id INT UNIQUE PRIMARY KEY, username TEXT UNIQUE, password TEXT, name TEXT, lastName TEXT, gender TEXT)", function(err) {
        if (err)
            console.log(err.message)
        else {
                var fillUser = db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?)")
                
                for (i=0; i < users.length ; i++) {
                    if (users[i].user_id != null, users[i].username != null, users[i].password != null)
                        fillUser.run(users[i].user_id, users[i].username, users[i].password, "", "", "")
                }
            fillUser.finalize()    
        }        
    })
       
       
     db.run("CREATE TABLE if not exists roles (role_id INT UNIQUE PRIMARY KEY, role TEXT UNIQUE)", function(err) {
        if (err)
            console.log(err.message)
        else {
                var fillRole = db.prepare("INSERT INTO roles VALUES (?,?)")
                
                for (i=0; i < roles.length ; i++) {
                    if (roles[i].role_id != null, roles[i].role != null)
                        fillRole.run(roles[i].role_id, roles[i].role)
                }
            fillRole.finalize()    
        }        
    })
     
     db.run("CREATE TABLE if not exists roleMembers (memberId INT, role_id INT)", function(err) {
        if (err)
            console.log(err.message)
        else {
                var fillMember = db.prepare("INSERT INTO roleMembers VALUES (?,?)")
                
                fillMember.run(0, 0)
                fillMember.run(1, 1)
                fillMember.run(1, 2)
                fillMember.finalize()    
        }        
    })
       
})  