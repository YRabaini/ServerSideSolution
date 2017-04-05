var express = require('express')
var bodyParser = require('body-parser')
var sqlite3 = require('sqlite3')

var db = new sqlite3.Database("./db/movie-friends.db")

var app = express()

// This middleware enables us to use request.body to read data from forms with
// method="POST".
app.use(bodyParser.urlencoded({extended: false}))

// This setting tells express that we use handlebars as our view engine.
app.set('view engine', 'hbs')

var db = new sqlite3.Database("./db/movie-friends.db")

var movies = [
    {id: 0, year: 2001, title: "Shrek"},
    {id: 1, year: 1995, title: "Dumb & Dumber"},
    {id: 2, year: 1994, title: "The Lion King"}
]

var ratings = [
    {movie_id: 0, rating: 5},
    {movie_id: 0, rating: 4},
    {movie_id: 2, rating: 3},
    {movie_id: 1, rating: 0}
]


app.get("/", function(request, response){
	response.render('movies', {movies: movies})
})

app.get("/movies/:id", function(request, response){
	var id = parseInt(request.params.id)
//	var rating = []
    
    db.all("select rating from rating where rating.movie_id = ?", id, function(err, rows){
        console.log(rows[0].rating)
        response.render('movie', {movies: movies[id], rows: rows})
    })
/*1
        for (i=0; i < ratings.length ; i++) {
            if (ratings[i].movie_id == id)
                rating.push(ratings[i].rating)
*/
})

app.get("/create-movie", function(request, response){
	response.render('create-movie', {})
})

app.post("/create-movie", function(request, response){
	
    var flag = 0
	var newMovie = {
		id: movies.length,
		title: request.body.title,
		year: parseInt(request.body.year)
	}
    
    for (i=0; i < movies.length ; i++) {
        if (movies[i].title.toLowerCase() == newMovie.title.toLowerCase() && movies[i].year == newMovie.year) {
            newMovie.id = movies[i].id
            flag = 1
        }        
    }
    
    var newRating = {
        movie_id: newMovie.id,
        rating: parseInt(request.body.rating)
    }
	
	// Store the human.
    if (flag == 0)
	   movies.push(newMovie)
	
    ratings.push(newRating)

    response.redirect("/movies/"+newMovie.id)
	
})



app.listen(8000)
