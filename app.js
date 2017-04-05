var app = require('express')
var bodyParser = require('body-parser')
require('sqlite3')

db = 

var app = express()

// This middleware enables us to use request.body to read data from forms with
// method="POST".
app.use(bodyParser.urlencoded({extended: false}))

// This setting tells express that we use handlebars as our view engine.
app.set('view engine', 'hbs')

var db = new sqlite3.Database("./db/movie-friends.db")

var movies = [
    {id: 1, year: 2001, title: "Shrek"},
    {id: 2, year: 1995, title: "Dumb & Dumber"},
    {id: 3, year: 1994, title: "The Lion King"}
]

var ratings = [
    {movie_id: 1, rating: 5},
    {movie_id: 1, rating: 4},
    {movie_id: 2, rating: 3},
    {movie_id: 3, rating: 0}
]


app.get("/", function(request, response){
	response.render('/movies', {movies: movies})
})

app.get("/movies/:id", function(request, response){
	var id = parseInt(request.params.id)
	response.render('movie', {movie: movies[id]})
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
    
    
    
    for (i=1; i <= movies.length ; i++) {
        if (movies[i].title.toLowerCase() == newMovie.title.toLowerCase() && movies[i].year == newMovie.year) {
            newMovie.id = movies[i].id
            flag = 1
        }        
    }
    
    var newRating {
        movie_id = newMovie.id,
        rating = parseInt(request.body.rating)
    }
	
	// Store the human.
    if flag == 0
	   movies.push(newMovie)
	
    ratings.push(newRating)

    response.redirect("/movies/"+newMovie.id)
	
})



app.listen(8000)
